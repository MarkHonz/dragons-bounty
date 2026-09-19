import Stripe from 'stripe';
import { deleteCart } from '@/db/cart-db';
import {
	createOrder,
	createOrderProduct,
	getOrderByPaymentIntentId,
	OrderProps,
	recordStripeChargeRefund,
} from '@/db/orders-db';
import { getUserById, UserProps } from '@/db/user-db';
import {
	getProductNameById,
	getProductPriceById,
	subtractProductQuantityById,
} from '@/db/product-db';
import { revalidatePath } from 'next/cache';
import { sendOrderConfirmationEmail } from '@/lib/notifications';
import { stripe } from '@/lib/stripe';

type PurchaseItemProps = {
	cart_id: string;
	product_id: string;
	quantity: number;
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
	const cartId = paymentIntent.metadata.cart_id;

	const purchaseItems = JSON.parse(
		paymentIntent.metadata.cart_items
	) as PurchaseItemProps[];

	const order = (await createOrder({
		productTotalInCents: productTotal,
		taxTotalInCents: taxTotal,
		shippingTotalInCents: shippingTotal,
		totalInCents: orderTotal,
		profileId,
		stripePaymentIntentId: paymentIntent.id,
	})) as OrderProps;

	const lineItems = (
		await Promise.all(
			purchaseItems.map(async (item) => {
				if (item.product_id && item.quantity && order.id) {
					const productPrice = (await getProductPriceById(
						item.product_id
					)) as number;
					await createOrderProduct(
						order.id,
						item.product_id,
						item.quantity,
						productPrice
					);
					await subtractProductQuantityById(item.product_id, item.quantity);
					const productName = (await getProductNameById(
						item.product_id
					)) as string;
					return {
						name: productName,
						quantity: item.quantity,
						priceInCents: productPrice,
					};
				}
				return null;
			})
		)
	).filter(
		(item): item is { name: string; quantity: number; priceInCents: number } =>
			item !== null
	);

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
			totalInCents: order.totalInCents,
			orderUrl: `${process.env.NEXT_PUBLIC_SERVER_URL}/orders/${order.id}`,
		});
	} catch (error) {
		console.error('Failed to send order confirmation email', error);
	}

	await deleteCart(cartId);
	revalidatePath('/', 'layout');

	return new Response('OK', { status: 200 });
}
