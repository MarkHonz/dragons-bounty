import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { getOrderByPaymentIntentId, OrderProps } from '@/db/orders-db';
import { getProfileIdByUserId } from '@/db/user-db';
import { verifyAuthSession } from '@/lib/auth';
import { fulfillPaymentIntent } from '@/lib/fulfill-payment';
import { signInUrl } from '@/lib/redirects';
import { stripe } from '@/lib/stripe';
import PurchaseSuccess from './_components/purchase-success';

type PurchaseSuccessPageProps = {
	searchParams: {
		payment_intent?: string | string[];
	};
};

// What the person is told. "done" means their order exists.
type Outcome = 'done' | 'processing' | 'delayed' | 'failed' | 'not-found';

const PAYMENT_ID = /^pi_[A-Za-z0-9]{10,}$/;

// Works out where this payment stands, and if it is paid but has no order yet
// (Stripe's message about it hasn't reached the site), makes the order right here.
// Only the customer who made the payment gets this far: anyone else is told it
// wasn't found, so a payment id alone never shows or does anything.
const settlePayment = async (
	paymentIntentId: string,
	userId: string
): Promise<Outcome> => {
	const profileId = await getProfileIdByUserId(userId);
	if (!profileId) return 'not-found';

	const order = (await getOrderByPaymentIntentId(
		paymentIntentId
	)) as OrderProps | null;
	if (order && !(order instanceof Error)) {
		return order.profileId === profileId ? 'done' : 'not-found';
	}

	// no order yet: ask Stripe what really happened to the payment
	let paymentIntent;
	try {
		paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
	} catch {
		return 'not-found';
	}
	if (paymentIntent.metadata.user_id !== userId) return 'not-found';

	if (paymentIntent.status === 'succeeded') {
		try {
			await fulfillPaymentIntent(paymentIntent);
			return 'done';
		} catch (error) {
			// nothing was changed; Stripe's own message (which is retried) or a
			// refresh of this page will finish the job
			console.error('Could not record the order for a paid payment', error);
			return 'delayed';
		}
	}
	if (paymentIntent.status === 'processing') return 'processing';
	return 'failed';
};

const Message = ({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) => (
	<main className="mx-auto max-w-lg px-5 py-20 sm:px-10">
		<Card className="flex flex-col gap-3 p-8 text-center shadow-warm-sm">
			<h1 className="font-display text-2xl font-semibold">{title}</h1>
			{children}
		</Card>
	</main>
);

export default async function PurchaseSuccessPage({
	searchParams,
}: PurchaseSuccessPageProps) {
	const paymentIntentId = searchParams.payment_intent;
	// without a (well-formed) payment id there is nothing to show
	if (
		typeof paymentIntentId !== 'string' ||
		!PAYMENT_ID.test(paymentIntentId)
	) {
		redirect('/orders');
	}

	const { user } = await verifyAuthSession();
	if (!user) redirect(signInUrl('/orders'));

	const outcome = await settlePayment(paymentIntentId, user.id);

	if (outcome === 'done') {
		return (
			<main className="mx-auto max-w-lg px-5 py-20 sm:px-10">
				<Card className="p-8 shadow-warm-sm">
					<PurchaseSuccess />
				</Card>
			</main>
		);
	}

	if (outcome === 'processing') {
		return (
			<Message title="Your payment is processing">
				<p className="text-muted-foreground">
					Your bank hasn&apos;t confirmed the payment yet. Your order will
					appear in{' '}
					<Link href="/orders" className="text-primary underline">
						Orders
					</Link>{' '}
					as soon as it does. You don&apos;t need to pay again.
				</p>
			</Message>
		);
	}

	if (outcome === 'delayed') {
		return (
			<Message title="Payment received">
				<p className="text-muted-foreground">
					Your payment went through, but we couldn&apos;t finish recording your
					order just yet. Please <strong>don&apos;t pay again</strong>. Refresh
					this page in a moment, or check{' '}
					<Link href="/orders" className="text-primary underline">
						Orders
					</Link>
					; if it still isn&apos;t there, contact us.
				</p>
			</Message>
		);
	}

	if (outcome === 'failed') {
		return (
			<Message title="Payment Failed">
				<p className="text-muted-foreground">
					There was an error processing your payment, and you haven&apos;t been
					charged.
				</p>
				<Link href="/cart" className="text-primary underline">
					Back to your cart
				</Link>
			</Message>
		);
	}

	return (
		<Message title="We couldn't find that payment">
			<Link href="/orders" className="text-primary underline">
				Go to your orders
			</Link>
		</Message>
	);
}
