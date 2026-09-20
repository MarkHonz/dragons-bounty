import Stripe from 'stripe';
import { deleteCart } from '@/db/cart-db';
import {
	createOrder,
	createOrderProduct,
	getOrderByPaymentIntentId,
	OrderProps,
	recordStripeChargeRefund,
} from '@/db/orders-db';
import { getAddressByProfileId, getUserById, UserProps } from '@/db/user-db';
import { getPurchaseInfo, subtractStock } from '@/db/product-db';
import { setCartDiscountCode } from '@/db/discount-db';
import {
	deleteCheckoutSnapshot,
	getCheckoutSnapshot,
	SnapshotLine,
} from '@/db/checkout-snapshot-db';
import { formatVariantLabel } from '@/lib/variants';
import { revalidatePath } from 'next/cache';
import { sendOrderConfirmationEmail } from '@/lib/notifications';
import { stripe } from '@/lib/stripe';

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

export async function POST(req: Request) {
	const body = await req.text();
	const signature = req.headers.get('stripe-signature');

	if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
		return new Response('Missing signature or webhook secret', {
			status: 400,
		});
	}

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(
			body,
			signature,
			process.env.STRIPE_WEBHOOK_SECRET
		);
	} catch (error) {
		console.error('Webhook signature verification failed:', error);
		return new Response('Invalid signature', { status: 400 });
	}

	// keep orders in step with refunds made in the Stripe dashboard
	if (event.type === 'charge.refunded') {
		const charge = event.data.object as Stripe.Charge;
		const paymentIntentId =
			typeof charge.payment_intent === 'string'
				? charge.payment_intent
				: charge.payment_intent?.id;
		if (paymentIntentId) {
			await recordStripeChargeRefund(paymentIntentId, {
				amountRefunded: charge.amount_refunded,
				fullyRefunded: charge.amount_refunded >= charge.amount,
			});
			revalidatePath('/admin/orders');
			revalidatePath('/orders');
		}
		return new Response('OK', { status: 200 });
	}

	if (event.type !== 'payment_intent.succeeded') {
		return new Response('OK', { status: 200 });
	}

	const paymentIntent = event.data.object as Stripe.PaymentIntent;

	// idempotency: if an order for this payment intent already exists, no-op
	const existingOrder = await getOrderByPaymentIntentId(paymentIntent.id);
	if (existingOrder) {
		return new Response('OK', { status: 200 });
	}

	const user = (await getUserById(paymentIntent.metadata.user_id)) as UserProps;
	const profileId = user.profile.id as string;

	const productTotal = parseInt(paymentIntent.metadata.cart_total, 10);
	const shippingTotal = parseInt(paymentIntent.metadata.shipping_total, 10);
	const taxTotal = parseInt(paymentIntent.metadata.tax_total, 10);
	const orderTotal = parseInt(paymentIntent.metadata.order_total, 10);
	// a payment started before discount codes existed has neither of these
	const discountTotal = parseInt(paymentIntent.metadata.discount_total ?? '', 10) || 0;
	const discountCode = paymentIntent.metadata.discount_code || null;
	const cartId = paymentIntent.metadata.cart_id;

	const orderLines = await getOrderLines(paymentIntent);

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

	const order = (await createOrder({
		productTotalInCents: productTotal,
		taxTotalInCents: taxTotal,
		shippingTotalInCents: shippingTotal,
		totalInCents: orderTotal,
		discountInCents: discountTotal,
		discountCode,
		profileId,
		stripePaymentIntentId: paymentIntent.id,
		...shipTo,
	})) as OrderProps;

	if (orderLines.length === 0) {
		// the customer has paid, so the order is kept; this makes the gap visible
		console.error(`Order ${order.id} was created with no line items`, paymentIntent.id);
	}

	const lineItems: { name: string; quantity: number; priceInCents: number }[] = [];
	for (const line of orderLines) {
		await createOrderProduct(
			order.id,
			line.productId,
			line.variantId,
			line.variantName,
			line.quantity,
			line.unitPriceInCents
		);
		await subtractStock(line.productId, line.variantId, line.quantity);
		lineItems.push({
			name: formatVariantLabel(line.name, line.variantName),
			quantity: line.quantity,
			priceInCents: line.unitPriceInCents,
		});
	}

	// email failures must never break order creation or cause a Stripe retry
	try {
		await sendOrderConfirmationEmail({
			name: user.profile.name ?? 'there',
			email: user.email,
			orderId: order.id,
			lineItems,
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

	await deleteCart(cartId);
	// a code applies to the one order it was used on
	await setCartDiscountCode(cartId, null);
	// the snapshot has done its job
	await deleteCheckoutSnapshot(paymentIntent.id);
	revalidatePath('/', 'layout');

	return new Response('OK', { status: 200 });
}
