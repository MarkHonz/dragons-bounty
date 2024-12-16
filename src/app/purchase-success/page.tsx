import { deleteCart } from '@/db/cart-db';
import {
	createOrder /* , getOrders, getOrdersByProfileId */,
	createOrderProduct,
	OrderProps,
} from '@/db/orders-db';
import { getUserById, UserProps } from '@/db/user-db';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';
import PurchaseSuccess from './_components/purchase-success';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

type PurchaseSuccessPageProps = {
	searchParams: {
		payment_intent: string;
	};
};

type PurchaseItemProps = {
	cart_id: string;
	product_id: string;
	quantity: number;
};

export default async function PurchaseSuccessPage({
	searchParams,
}: PurchaseSuccessPageProps) {
	// if the payment intent is undefined, redirect to the orders page
	if (searchParams.payment_intent == undefined) {
		redirect('/orders');
	}
	// get the payment intent from the search params
	const paymentIntent = await stripe.paymentIntents.retrieve(
		searchParams.payment_intent
	);

	// if the payment intent is successful
	if (paymentIntent.status === 'succeeded') {
		// get the user by the user_id
		const user = (await getUserById(
			paymentIntent.metadata.user_id
		)) as UserProps;
		// get the user's profile id
		const profileId = user.profile.id as string;

		// get the product total, shipping total, tax total, and order total from the payment intent metadata
		const productTotal = parseInt(paymentIntent.metadata.cart_total) as number;
		const shippingTotal = parseInt(
			paymentIntent.metadata.shipping_total
		) as number;
		const taxTotal = parseInt(paymentIntent.metadata.tax_total) as number;
		const orderTotal = parseInt(paymentIntent.metadata.order_total) as number;
		const cartId = paymentIntent.metadata.cart_id;

		// get the purchases items from the payment intent metadata
		const purchaseItems = JSON.parse(
			paymentIntent.metadata.cart_items
		) as PurchaseItemProps[];

		// create an order for the user
		const order = (await createOrder({
			productTotalInCents: productTotal,
			taxTotalInCents: taxTotal,
			shippingTotalInCents: shippingTotal,
			totalInCents: orderTotal,
			profileId,
		})) as OrderProps;

		// create the order products
		await Promise.all(
			purchaseItems.map(async (item) => {
				if (item.product_id && item.quantity && order.id) {
					await createOrderProduct(order.id, item.product_id, item.quantity);
				}
			})
		);

		// clear the database cart
		await deleteCart(cartId);

		return (
			<main className="flex flex-col gap-3 justify-center items-center mt-20 max-w-lg m-auto">
				<PurchaseSuccess />
			</main>
		);
	} else {
		return (
			<main className="flex flex-col gap-3 justify-center items-center max-w-lg m-auto mt-20">
				<h1 className="text-3xl">Payment Failed</h1>
				<p>There was an error processing your payment.</p>
			</main>
		);
	}
}
