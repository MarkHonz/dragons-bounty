import Stripe from 'stripe';

import db from '@/db/db';
import { getPurchaseInfo } from '@/db/product-db';
import { getCheckoutSnapshot, SnapshotLine } from '@/db/checkout-snapshot-db';
import { getAddressByProfileId, getUserById } from '@/db/user-db';
import { formatVariantLabel } from '@/lib/variants';
import {
	sendArtistNewOrderEmail,
	sendOrderConfirmationEmail,
} from '@/lib/notifications';

// how a cart was stored on the payment before checkout snapshots existed
type LegacyPurchaseItem = {
	cart_id: string;
	product_id: string;
	quantity: number;
};

// The lines of the order: what the customer was shown at checkout (the
// snapshot). A payment started before snapshots existed carries its cart in the
// payment's metadata instead, and is priced from the current prices as it used to
// be; without either there is nothing to go on.
const getOrderLines = async (
	paymentIntent: Stripe.PaymentIntent
): Promise<SnapshotLine[]> => {
	const snapshot = await getCheckoutSnapshot(paymentIntent.id);
	if (snapshot) return snapshot.lines;

	const legacy = paymentIntent.metadata.cart_items;
	if (!legacy) return [];
	let items: LegacyPurchaseItem[];
	try {
		items = JSON.parse(legacy) as LegacyPurchaseItem[];
	} catch {
		return [];
	}
	const lines: SnapshotLine[] = [];
	for (const item of items) {
		if (!item.product_id || !item.quantity) continue;
		const info = await getPurchaseInfo(item.product_id);
		if (!info) continue;
		lines.push({
			productId: item.product_id,
			variantId: '',
			name: info.productName,
			variantName: '',
			unitPriceInCents: info.priceInCents,
			quantity: item.quantity,
		});
	}
	return lines;
};

const wholeNumber = (value: string | undefined) => {
	const number = Number(value);
	return Number.isInteger(number) ? number : null;
};

export type FulfillResult = {
	// "created" when this call made the order, "already" when it already existed
	status: 'created' | 'already';
	orderId: string;
};

// Turns a paid payment into an order: the order, its lines, the stock taken out,
// the customer's cart emptied and the checkout snapshot removed, all in ONE
// all-or-nothing database step. The payment's id is unique on orders, so it is
// also the claim on the payment: when the Stripe webhook and the purchase-success
// page both try at once, exactly one wins and the other finds the order already
// there (so nothing is created, or taken out of stock, twice). Only the winner
// sends the confirmation email.
//
// Throws when it can't (no such customer, a database error): nothing has been
// changed, and it is safe to try again.
const fulfillOnce = async (
	paymentIntent: Stripe.PaymentIntent
): Promise<FulfillResult> => {
	const existingOrder = await db.order.findUnique({
		where: { stripePaymentIntentId: paymentIntent.id },
		select: { id: true },
	});
	if (existingOrder) return { status: 'already', orderId: existingOrder.id };

	const userId = paymentIntent.metadata.user_id;
	const user = userId ? await getUserById(userId) : null;
	if (!user || !user.profile) {
		throw new Error(`No customer found for payment ${paymentIntent.id}`);
	}
	const profileId = user.profile.id;

	const productTotal = wholeNumber(paymentIntent.metadata.cart_total);
	const shippingTotal = wholeNumber(paymentIntent.metadata.shipping_total);
	const taxTotal = wholeNumber(paymentIntent.metadata.tax_total);
	const orderTotal = wholeNumber(paymentIntent.metadata.order_total);
	if (
		productTotal === null ||
		shippingTotal === null ||
		taxTotal === null ||
		orderTotal === null
	) {
		throw new Error(`Payment ${paymentIntent.id} has no order totals`);
	}
	if (orderTotal !== paymentIntent.amount) {
		console.error(
			`Payment ${paymentIntent.id}: the order total (${orderTotal}) differs from the amount charged (${paymentIntent.amount})`
		);
	}
	// a payment started before discount codes existed has neither of these
	const discountTotal = wholeNumber(paymentIntent.metadata.discount_total) ?? 0;
	const discountCode = paymentIntent.metadata.discount_code || null;
	const cartId = paymentIntent.metadata.cart_id;

	const orderLines = await getOrderLines(paymentIntent);
	if (orderLines.length === 0) {
		// the customer has paid, so the order is kept; this makes the gap visible
		console.error(`Payment ${paymentIntent.id} has no line items to record`);
	}

	// the address the customer submitted at checkout was attached to the payment;
	// fall back to the profile's address for a payment that has none
	const shipping = paymentIntent.shipping;
	const profileAddress = shipping?.address?.line1
		? null
		: await getAddressByProfileId(profileId);
	const shipTo = shipping?.address?.line1
		? {
				shipToName: shipping.name ?? null,
				shipToAddress1: shipping.address.line1,
				shipToAddress2: shipping.address.line2 ?? null,
				shipToCity: shipping.address.city ?? null,
				shipToState: shipping.address.state ?? null,
				shipToZip: shipping.address.postal_code ?? null,
			}
		: {
				shipToName: profileAddress?.name ?? null,
				shipToAddress1: profileAddress?.address1 ?? null,
				shipToAddress2: profileAddress?.address2 ?? null,
				shipToCity: profileAddress?.city ?? null,
				shipToState: profileAddress?.state ?? null,
				shipToZip: profileAddress?.zip ?? null,
			};

	let order;
	try {
		order = await db.$transaction(
			async (tx) => {
				// the unique payment id is the claim: if another request got here
				// first, this fails and nothing below happens
				const created = await tx.order.create({
					data: {
						productTotalInCents: productTotal,
						taxTotalInCents: taxTotal,
						shippingTotalInCents: shippingTotal,
						totalInCents: orderTotal,
						discountInCents: discountTotal,
						discountCode,
						stripePaymentIntentId: paymentIntent.id,
						...shipTo,
						profile: { connect: { id: profileId } },
					},
				});
				// who sells each product right now: copied onto the line, so
				// reassigning a product later never moves this order to someone else
				const sellers = await tx.product.findMany({
					where: { id: { in: orderLines.map((line) => line.productId) } },
					select: { id: true, artistId: true },
				});
				const sellerOf = new Map(sellers.map((p) => [p.id, p.artistId ?? '']));
				for (const line of orderLines) {
					await tx.order_Product.create({
						data: {
							order_id: created.id,
							product_id: line.productId,
							variant_id: line.variantId,
							variantName: line.variantName,
							artistId: sellerOf.get(line.productId) ?? '',
							quantity: line.quantity,
							priceInCents: line.unitPriceInCents,
						},
					});
					// stock leaves the option that was bought, or the product itself
					// (products without a stock number aren't tracked, so they are left alone)
					if (line.variantId) {
						await tx.productVariant.updateMany({
							where: { id: line.variantId, productId: line.productId },
							data: { quantity: { decrement: line.quantity } },
						});
					} else {
						await tx.product.updateMany({
							where: { id: line.productId, quantity: { not: null } },
							data: { quantity: { decrement: line.quantity } },
						});
					}
				}
				if (cartId) {
					await tx.cart_Product.deleteMany({ where: { cart_id: cartId } });
					// a code applies to the one order it was used on
					await tx.cart.updateMany({
						where: { id: cartId },
						data: { discountCode: null },
					});
				}
				await tx.checkoutSnapshot.deleteMany({
					where: { paymentIntentId: paymentIntent.id },
				});
				return created;
			},
			// a busy moment shouldn't turn a paid order into an error
			{ maxWait: 20000, timeout: 20000 }
		);
	} catch (error) {
		// Someone else may have made this order in the meantime (the unique payment
		// id refused ours). If the database was just busy or timed out, that other
		// request may still be finishing, so give its order a moment to appear
		// before calling this a failure.
		const busy =
			(error as { code?: string }).code !== undefined &&
			['P2002', 'P1008', 'P2028', 'P2034'].includes(
				(error as { code: string }).code
			);
		const deadline = Date.now() + (busy ? 8000 : 0);
		for (;;) {
			const winner = await db.order.findUnique({
				where: { stripePaymentIntentId: paymentIntent.id },
				select: { id: true },
			});
			if (winner) return { status: 'already', orderId: winner.id };
			if (Date.now() >= deadline) throw error;
			await new Promise((resolve) => setTimeout(resolve, 250));
		}
	}

	// email failures must never break order creation or cause a retry
	try {
		await sendOrderConfirmationEmail({
			name: user.profile.name ?? 'there',
			email: user.email,
			orderId: order.id,
			lineItems: orderLines.map((line) => ({
				name: formatVariantLabel(line.name, line.variantName),
				quantity: line.quantity,
				priceInCents: line.unitPriceInCents,
			})),
			productTotalInCents: order.productTotalInCents,
			shippingTotalInCents: order.shippingTotalInCents ?? null,
			taxTotalInCents: order.taxTotalInCents ?? null,
			discountInCents: order.discountInCents,
			discountCode: order.discountCode ?? null,
			totalInCents: order.totalInCents,
			orderUrl: `${process.env.NEXT_PUBLIC_SERVER_URL}/orders/${order.id}`,
			shippingAddress: {
				name: shipTo.shipToName,
				address1: shipTo.shipToAddress1,
				address2: shipTo.shipToAddress2,
				city: shipTo.shipToCity,
				state: shipTo.shipToState,
				zip: shipTo.shipToZip,
			},
		});
	} catch (error) {
		console.error('Failed to send order confirmation email', error);
	}

	// each artist with items in the order is told what to ship, and where. One
	// failing never stops the others, and never affects the order.
	try {
		const artistLines = await db.order_Product.findMany({
			where: { order_id: order.id, artistId: { not: '' } },
			select: {
				artistId: true,
				variantName: true,
				quantity: true,
				Product: { select: { name: true } },
			},
		});
		const artistIds = Array.from(new Set(artistLines.map((line) => line.artistId)));
		const artists = await db.user.findMany({
			where: { id: { in: artistIds }, isArtist: true },
			select: { id: true, email: true, artistName: true },
		});
		for (const artist of artists) {
			try {
				await sendArtistNewOrderEmail({
					email: artist.email,
					artistName: artist.artistName ?? 'there',
					orderId: order.id,
					items: artistLines
						.filter((line) => line.artistId === artist.id)
						.map((line) => ({
							name: formatVariantLabel(line.Product.name, line.variantName),
							quantity: line.quantity,
						})),
					shipTo: {
						name: shipTo.shipToName,
						address1: shipTo.shipToAddress1,
						address2: shipTo.shipToAddress2,
						city: shipTo.shipToCity,
						state: shipTo.shipToState,
						zip: shipTo.shipToZip,
					},
					artistPageUrl: `${process.env.NEXT_PUBLIC_SERVER_URL}/artist/${artist.id}`,
				});
			} catch (error) {
				console.error('Failed to send an artist their new-order email', error);
			}
		}
	} catch (error) {
		console.error('Failed to notify artists about a new order', error);
	}

	return { status: 'created', orderId: order.id };
};

// Requests for the same payment that arrive together (the Stripe message and the
// purchase-success page, say) share one run instead of all trying at once, which
// keeps the database calm. The database's own claim (above) still decides it if
// they ever come from different servers. Kept on globalThis because the webhook
// and the page can be built as separate modules.
const running = ((
	globalThis as unknown as { fulfilling?: Map<string, Promise<FulfillResult>> }
).fulfilling ??= new Map<string, Promise<FulfillResult>>());

export const fulfillPaymentIntent = (
	paymentIntent: Stripe.PaymentIntent
): Promise<FulfillResult> => {
	const inProgress = running.get(paymentIntent.id);
	if (inProgress) return inProgress;
	const job = fulfillOnce(paymentIntent).finally(() =>
		running.delete(paymentIntent.id)
	);
	running.set(paymentIntent.id, job);
	return job;
};
