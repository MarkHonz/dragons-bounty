import Stripe from 'stripe';
import { deleteCart } from '@/db/cart-db';
import {
	createOrder,
	createOrderProduct,
	getOrderByPaymentIntentId,
	OrderProps,
} from '@/db/orders-db';
import { getUserById, UserProps } from '@/db/user-db';
import {
	getProductPriceById,
	subtractProductQuantityById,
} from '@/db/product-db';
import { revalidatePath } from 'next/cache';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

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
			}
		})
	);

	await deleteCart(cartId);
	revalidatePath('/', 'layout');

	return new Response('OK', { status: 200 });
}
