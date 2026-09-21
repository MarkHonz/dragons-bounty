import { verifyAuthSession } from '@/lib/auth';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import AddAddressForm from '@/components/forms/add-address-form';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';
import { getCartById, getCartIdByUserId } from '@/db/cart-db';
import { getAddressByProfileId, getProfileIdByUserId } from '@/db/user-db';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { getPurchaseInfo } from '@/db/product-db';
import {
	createCheckoutSnapshot,
	SnapshotLine,
	sweepOldCheckoutSnapshots,
} from '@/db/checkout-snapshot-db';
import { formatVariantLabel } from '@/lib/variants';
import { formatCurrency } from '@/lib/formatters';
import { signInUrl } from '@/lib/redirects';
import OrderTotals, { discountRows } from '@/components/order-totals';
import { getCartDiscount, getShippingRates } from '@/db/discount-db';
import { calculateTotals, isChargeable } from '@/lib/pricing';

if (!process.env.STRIPE_SECRET_KEY) {
	throw new Error('Stripe secret key is not defined');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

type CartItem = {
	product_id: string;
	variant_id: string;
	quantity: number;
	cart_id: string;
};

export default async function CheckoutPage() {
	// get the authenticated user
	const sessionUserId = await verifyAuthSession();
	let authenticatedUser = '';
	if (sessionUserId.user !== null) {
		authenticatedUser = sessionUserId.user.id;
	} else {
		authenticatedUser = 'guest';
	}

	// if the user is not authenticated, redirect to the sign-in page
	if (authenticatedUser === 'guest') {
		return redirect(signInUrl('/checkout'));
	}

	// get the cartId from the authenticated user
	const cartId = (await getCartIdByUserId(authenticatedUser)) as string;

	// get the cart items from the cartId
	const cartItems = (await getCartById(cartId)) as CartItem[];

	// Price every line from its product (and chosen option), and don't take
	// payment for something that is no longer for sale or for more than is in
	// stock: send the customer back to the cart, which says which items to fix.
	const lines: SnapshotLine[] = [];
	for (const item of cartItems) {
		if (!item.product_id) continue;
		const info = await getPurchaseInfo(item.product_id, item.variant_id);
		if (
			!info ||
			!info.buyable ||
			(info.quantity != null &&
				(info.quantity <= 0 || (item.quantity ?? 0) > info.quantity))
		) {
			return redirect('/cart');
		}
		lines.push({
			productId: item.product_id,
			variantId: item.variant_id,
			name: info.productName,
			variantName: info.variantName,
			unitPriceInCents: info.priceInCents,
			quantity: item.quantity ?? 0,
		});
	}
	// nothing to pay for
	if (lines.length === 0) return redirect('/cart');

	// A code that has stopped being valid sends the customer back to the cart,
	// which says so; the totals below are the same ones the cart showed.
	const cartDiscount = await getCartDiscount(cartId, authenticatedUser);
	if (cartDiscount.problem) return redirect('/cart');

	const totals = calculateTotals({
		itemsInCents: lines.reduce(
			(accumulatedTotal, line) =>
				accumulatedTotal + line.unitPriceInCents * line.quantity,
			0
		),
		discount: cartDiscount.rule,
		shipping: await getShippingRates(),
	});
	// Stripe can't charge a tiny amount
	if (!isChargeable(totals.totalInCents)) return redirect('/cart');
	const {
		itemsInCents: cartTotal,
		discountInCents: discountTotal,
		shippingInCents: shippingTotal,
		taxInCents: taxTotal,
		totalInCents: orderTotal,
	} = totals;

	// create a payment intent. The cart itself is kept in our own database (see
	// createCheckoutSnapshot): Stripe limits metadata to 500 characters.
	const paymentIntent = await stripe.paymentIntents.create({
		amount: orderTotal,
		currency: 'usd',
		// payment_method_types: ['card'],
		metadata: {
			user_id: authenticatedUser,
			cart_total: cartTotal,
			shipping_total: shippingTotal,
			discount_total: discountTotal,
			// codes are at most 30 characters, far under Stripe's 500-character limit
			discount_code: cartDiscount.code ?? '',
			tax_total: taxTotal,
			order_total: orderTotal,
			cart_id: cartId,
		},
	});

	if (paymentIntent.client_secret == null) {
		throw new Error('Client secret is not defined');
	}

	await createCheckoutSnapshot({
		paymentIntentId: paymentIntent.id,
		userId: authenticatedUser,
		cartId,
		lines,
	});
	// checkouts that were started and never paid don't pile up
	await sweepOldCheckoutSnapshots();

	// the address saved on the account starts the form off (when there is one)
	const profileId = await getProfileIdByUserId(authenticatedUser);
	const saved = profileId ? await getAddressByProfileId(profileId) : null;
	const savedAddress = saved?.address1
		? {
				address1: saved.address1,
				address2: saved.address2 ?? '',
				city: saved.city ?? '',
				state: saved.state ?? '',
				zip: saved.zip ?? '',
			}
		: null;

	return (
		<main className="mx-auto max-w-5xl px-5 py-10 sm:px-10">
			<h1 className="mb-6 font-display text-3xl font-semibold">Checkout</h1>
			<AddAddressForm
				clientSecret={paymentIntent.client_secret}
				orderTotal={orderTotal}
				savedAddress={savedAddress}
			>
				<Card className="shadow-warm-sm">
					<CardContent className="pt-6">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Product</TableHead>
									<TableHead>Quantity</TableHead>
									<TableHead>Price</TableHead>
									<TableHead>Total</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{lines.map((line) => (
									<TableRow key={`${line.productId}:${line.variantId}`}>
										<TableCell>
											{formatVariantLabel(line.name, line.variantName)}
										</TableCell>
										<TableCell className="text-center">
											{line.quantity}
										</TableCell>
										<TableCell>
											{formatCurrency(line.unitPriceInCents / 100)}
										</TableCell>
										<TableCell>
											{formatCurrency(
												(line.unitPriceInCents * line.quantity) / 100
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
					<CardFooter>
						<div className="w-full">
							<OrderTotals
								rows={[
									{ label: 'Cart Total', value: formatCurrency(cartTotal / 100) },
									...discountRows({
										discountCode: cartDiscount.code,
										discountInCents: discountTotal,
									}),
									{
										label: 'Shipping',
										value:
											shippingTotal === 0
												? 'Free'
												: formatCurrency(shippingTotal / 100),
									},
									{ label: 'Tax', value: formatCurrency(taxTotal / 100) },
									{
										label: 'Order Total',
										value: formatCurrency(orderTotal / 100),
										emphasis: true,
									},
								]}
							/>
						</div>
					</CardFooter>
				</Card>
			</AddAddressForm>
		</main>
	);
}
