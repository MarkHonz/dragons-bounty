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

export const updateOrderFulfillmentAction = async (formData: FormData) => {
	await assertAdminOrThrow();

	const orderId = formData.get('orderId')?.toString();
	if (!orderId) return;

	const fulfilled = formData.get('fulfilled') === 'on';
	const trackingNumber = formData.get('trackingNumber')?.toString() || null;

	const existingOrder = (await getOrderDetails(orderId)) as OrderProps | null;
	// a refunded order is closed: don't let it be marked shipped (and emailed)
	if (existingOrder?.refundedAt) return;
	const wasFulfilled = existingOrder?.fulfilled ?? false;

	await updateOrderFulfillment(orderId, { fulfilled, trackingNumber });

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
	await assertAdminOrThrow();

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
