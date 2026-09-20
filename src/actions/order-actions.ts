'use server';

import Stripe from 'stripe';
import { revalidatePath } from 'next/cache';
import { assertAdminOrThrow } from '@/lib/auth';
import {
	getOrderDetails,
	markOrderRefunded,
	OrderProps,
	updateOrderFulfillment,
} from '@/db/orders-db';
import { getProfileNameById, getUserByProfileId } from '@/db/user-db';
import { sendRefundEmail, sendShippingUpdateEmail } from '@/lib/notifications';
import { stripe } from '@/lib/stripe';
import { logActivity } from '@/db/activity-db';
import { addOrderNote, deleteOrderNote } from '@/db/order-notes-db';
import { MAX_NOTE_LENGTH } from '@/lib/order-notes';
import { formatCurrency } from '@/lib/formatters';

// the short id the emails and the phone layout use
const shortId = (orderId: string) => `#${orderId.slice(-8)}`;

export const updateOrderFulfillmentAction = async (formData: FormData) => {
	const { user: admin } = await assertAdminOrThrow();

	const orderId = formData.get('orderId')?.toString();
	if (!orderId) return;

	const fulfilled = formData.get('fulfilled') === 'on';
	const trackingNumber = formData.get('trackingNumber')?.toString() || null;

	const existingOrder = (await getOrderDetails(orderId)) as OrderProps | null;
	// a refunded order is closed: don't let it be marked shipped (and emailed)
	if (existingOrder?.refundedAt) return;
	const wasFulfilled = existingOrder?.fulfilled ?? false;

	const updated = await updateOrderFulfillment(orderId, {
		fulfilled,
		trackingNumber,
	});

	// record what actually changed; saving with nothing changed writes nothing
	if (existingOrder && !(updated instanceof Error)) {
		const label = shortId(orderId);
		if (fulfilled !== wasFulfilled) {
			await logActivity(
				admin.id,
				'ORDER',
				`Marked order ${label} as ${fulfilled ? 'shipped' : 'not shipped'}`,
				orderId
			);
		}
		const oldTracking = existingOrder.trackingNumber || null;
		if (trackingNumber !== oldTracking) {
			await logActivity(
				admin.id,
				'ORDER',
				trackingNumber
					? oldTracking
						? `Changed the tracking number on order ${label} to ${trackingNumber}`
						: `Added tracking number ${trackingNumber} to order ${label}`
					: `Removed the tracking number from order ${label}`,
				orderId
			);
		}
	}

	// only notify on the false -> true transition, never on repeat saves
	if (!wasFulfilled && fulfilled && existingOrder) {
		try {
			const user = await getUserByProfileId(existingOrder.profileId);
			if (user) {
				const name = await getProfileNameById(existingOrder.profileId);
				await sendShippingUpdateEmail({
					name: name ?? 'there',
					email: user.email,
					orderId,
					trackingNumber,
					orderUrl: `${process.env.NEXT_PUBLIC_SERVER_URL}/orders/${orderId}`,
				});
			}
		} catch (error) {
			console.error('Failed to send shipping update email', error);
		}
	}

	revalidatePath('/admin/orders');
	revalidatePath(`/admin/orders/${orderId}`);
};

// Refund an order in full. Goes through Stripe when the order has a payment on
// record; otherwise it only marks the order refunded (no money moves).
export const refundOrderAction = async (orderId: string, restock: boolean) => {
	const { user: admin } = await assertAdminOrThrow();

	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	const order = (await getOrderDetails(orderId)) as OrderProps | null;
	if (!order || order instanceof Error) {
		response.errors.push('Order not found.');
		return response;
	}
	if (order.refundedAt) {
		response.errors.push('This order has already been refunded.');
		return response;
	}

	const paymentIntentId = order.stripePaymentIntentId ?? null;
	let stripeRefundId: string | null = null;

	if (paymentIntentId) {
		try {
			const refund = await stripe.refunds.create({
				payment_intent: paymentIntentId,
			});
			stripeRefundId = refund.id;
		} catch (error) {
			if (
				error instanceof Stripe.errors.StripeError &&
				error.code === 'charge_already_refunded'
			) {
				// refunded elsewhere (a double click, or the Stripe dashboard): keep
				// that refund's id and just record it here
				const existing = await stripe.refunds.list({
					payment_intent: paymentIntentId,
					limit: 1,
				});
				stripeRefundId = existing.data[0]?.id ?? null;
			} else {
				console.error('Stripe refund failed', error);
				response.errors.push(
					error instanceof Stripe.errors.StripeError
						? `Stripe could not refund this order: ${error.message}`
						: 'The refund failed, so nothing was changed. Please try again.'
				);
				return response;
			}
		}
	}

	let recorded: boolean;
	try {
		recorded = await markOrderRefunded(order.id, {
			refundedAmountInCents: order.totalInCents,
			stripeRefundId,
			restock,
			viaStripe: paymentIntentId !== null,
		});
	} catch (error) {
		console.error('Failed to record refund', error);
		response.errors.push(
			paymentIntentId
				? 'The card was refunded, but saving that on the site failed. Reload the page and check the order before trying again.'
				: 'Failed to record the refund. Please try again.'
		);
		return response;
	}
	if (!recorded) {
		response.errors.push('This order has already been refunded.');
		return response;
	}

	await logActivity(
		admin.id,
		'ORDER',
		`Refunded order ${shortId(order.id)} (${formatCurrency(order.totalInCents / 100)}${
			paymentIntentId ? ' through Stripe' : ', marked by hand: no money moved'
		}${restock ? ', items returned to stock' : ''})`,
		order.id
	);

	// only email when money actually moved through Stripe; email failures must
	// never undo a refund that already happened
	if (paymentIntentId) {
		try {
			const user = await getUserByProfileId(order.profileId);
			if (user) {
				const name = await getProfileNameById(order.profileId);
				await sendRefundEmail({
					name: name ?? 'there',
					email: user.email,
					orderId: order.id,
					refundedAmountInCents: order.totalInCents,
					orderUrl: `${process.env.NEXT_PUBLIC_SERVER_URL}/orders/${order.id}`,
				});
			}
		} catch (error) {
			console.error('Failed to send refund email', error);
		}
	}

	revalidatePath('/admin/orders');
	revalidatePath(`/admin/orders/${order.id}`);
	revalidatePath('/orders');
	revalidatePath(`/orders/${order.id}`);
	// stock levels changed
	if (restock) revalidatePath('/', 'layout');

	response.success = true;
	return response;
};

// --- admin-only notes on an order ---

export const addOrderNoteAction = async (orderId: string, body: string) => {
	const { user: admin } = await assertAdminOrThrow();

	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	if (typeof orderId !== 'string' || typeof body !== 'string') {
		response.errors.push('Invalid note.');
		return response;
	}
	const text = body.trim();
	if (text.length === 0) {
		response.errors.push('Write something first.');
		return response;
	}
	if (text.length > MAX_NOTE_LENGTH) {
		response.errors.push(`Notes can be up to ${MAX_NOTE_LENGTH} characters.`);
		return response;
	}

	let note;
	try {
		note = await addOrderNote(orderId, admin.id, text);
	} catch (error) {
		console.error('Failed to add a note', error);
		response.errors.push('Failed to save the note. Please try again.');
		return response;
	}
	if (!note) {
		response.errors.push('Order not found.');
		return response;
	}

	// the log says a note was added, not what it says
	await logActivity(
		admin.id,
		'ORDER',
		`Added a note to order ${shortId(orderId)}`,
		orderId
	);
	revalidatePath(`/admin/orders/${orderId}`);
	response.success = true;
	return response;
};

export const deleteOrderNoteAction = async (noteId: string) => {
	const { user: admin } = await assertAdminOrThrow();

	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	const orderId =
		typeof noteId === 'string' ? await deleteOrderNote(noteId) : null;
	if (!orderId) {
		response.errors.push('That note no longer exists.');
		return response;
	}

	await logActivity(
		admin.id,
		'ORDER',
		`Deleted a note from order ${shortId(orderId)}`,
		orderId
	);
	revalidatePath(`/admin/orders/${orderId}`);
	response.success = true;
	return response;
};
