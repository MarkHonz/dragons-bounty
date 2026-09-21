import Stripe from 'stripe';
import { recordStripeChargeRefund } from '@/db/orders-db';
import { revalidatePath } from 'next/cache';
import { stripe } from '@/lib/stripe';
import { fulfillPaymentIntent } from '@/lib/fulfill-payment';

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

	// The purchase-success page can also make the order (if this message is late),
	// so both go through the one function that makes sure it is made exactly once.
	// If it can't be done it throws, Stripe gets an error and tries again later.
	await fulfillPaymentIntent(event.data.object as Stripe.PaymentIntent);
	revalidatePath('/', 'layout');

	return new Response('OK', { status: 200 });
}
