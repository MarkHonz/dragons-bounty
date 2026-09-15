import { getOrderByPaymentIntentId } from '@/db/orders-db';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';
import PurchaseSuccess from './_components/purchase-success';
import { Card } from '@/components/ui/card';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

type PurchaseSuccessPageProps = {
	searchParams: {
		payment_intent: string;
	};
};

export default async function PurchaseSuccessPage({
	searchParams,
}: PurchaseSuccessPageProps) {
	// if the payment intent is undefined, redirect to the orders page
	if (searchParams.payment_intent == undefined) {
		redirect('/orders');
	}

	// the order itself is created by the Stripe webhook (payment_intent.succeeded),
	// not here — this page only displays the result once it lands
	const order = await getOrderByPaymentIntentId(searchParams.payment_intent);

	if (order) {
		return (
			<main className="mx-auto max-w-lg px-5 py-20 sm:px-10">
				<Card className="p-8 shadow-warm-sm">
					<PurchaseSuccess />
				</Card>
			</main>
		);
	}

	// webhook hasn't landed yet — confirm the charge succeeded and show a
	// brief processing state rather than creating the order here ourselves,
	// which would race the webhook and risk a duplicate order
	const paymentIntent = await stripe.paymentIntents.retrieve(
		searchParams.payment_intent
	);

	if (paymentIntent.status === 'succeeded') {
		return (
			<main className="mx-auto max-w-lg px-5 py-20 sm:px-10">
				<Card className="flex flex-col gap-3 p-8 text-center shadow-warm-sm">
					<h1 className="font-display text-2xl font-semibold">
						Processing your order&hellip;
					</h1>
					<p className="text-muted-foreground">
						Your payment succeeded. Your order confirmation will appear in{' '}
						<a href="/orders" className="text-primary underline">
							Orders
						</a>{' '}
						shortly &mdash; refresh this page in a moment.
					</p>
				</Card>
			</main>
		);
	}

	return (
		<main className="mx-auto max-w-lg px-5 py-20 sm:px-10">
			<Card className="flex flex-col gap-3 p-8 text-center shadow-warm-sm">
				<h1 className="font-display text-2xl font-semibold">Payment Failed</h1>
				<p className="text-muted-foreground">
					There was an error processing your payment.
				</p>
			</Card>
		</main>
	);
}
