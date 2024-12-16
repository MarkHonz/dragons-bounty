import { verifyAuthSession } from '@/lib/auth';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import AddAddressForm from '@/components/forms/add-address-form';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';
import { getCartById, getCartIdByUserId } from '@/db/cart-db';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { getProductById, ProductProps } from '@/db/product-db';
import { formatCurrency } from '@/lib/formatters';

if (!process.env.STRIPE_SECRET_KEY) {
	throw new Error('Stripe secret key is not defined');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

interface CartItem {
	product_id: string;
	quantity: number;
	cart_id: string;
}

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
		return redirect('/sign-in');
	}

	// get the cartId from the authenticated user
	const cartId = (await getCartIdByUserId(authenticatedUser)) as string;

	// get the cart items from the cartId
	const cartItems = (await getCartById(cartId)) as CartItem[];
	// map over the cart items and get the product details and calculate the total
	// for each item
	const cartTotals = await Promise.all(
		cartItems.map(async (item) => {
			if (item.product_id) {
				const product = (await getProductById(item.product_id)) as ProductProps;
				const total = product.priceInCents * (item.quantity ?? 0);
				return total;
			}
			return 0;
		})
	);
	// calculate the cart total by adding all the totals
	const cartTotal = cartTotals.reduce(
		(accumulatedTotal, currentTotal) => accumulatedTotal + currentTotal,
		0
	);
	// calculate the shipping, tax, and order total
	const shippingTotal = 999;
	const taxTotal = Math.round((cartTotal + shippingTotal) * 0.0675);
	const orderTotal = cartTotal + shippingTotal + taxTotal;

	// create a payment intent
	const paymentIntent = await stripe.paymentIntents.create({
		amount: orderTotal,
		currency: 'usd',
		// payment_method_types: ['card'],
		metadata: {
			user_id: authenticatedUser,
			cart_total: cartTotal,
			shipping_total: shippingTotal,
			tax_total: taxTotal,
			order_total: orderTotal,
			cart_items: JSON.stringify(cartItems),
			cart_id: cartId,
		},
	});

	if (paymentIntent.client_secret == null) {
		throw new Error('Client secret is not defined');
	}

	return (
		<main className="flex flex-col gap-3 justify-center items-center max-w-lg m-auto ">
			<h1 className="text-4xl font-semibold p-3 mt-5">Checkout</h1>
			<Card className="p-3 mb-3">
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Product</TableHead>
								<TableHead>Quantity</TableHead>
								<TableHead>Price</TableHead>
								<TableHead>Total</TableHead>
								{/* <TableHead>Remove</TableHead> */}
							</TableRow>
						</TableHeader>
						<TableBody>
							{cartItems.map(async (item) => {
								if (item.product_id) {
									const product = (await getProductById(
										item.product_id
									)) as ProductProps;
									const total = product.priceInCents * (item.quantity ?? 0);
									return (
										<TableRow key={item.product_id}>
											<TableCell>{product.name}</TableCell>
											<TableCell className="text-center">
												{item.quantity}
											</TableCell>
											<TableCell>
												{formatCurrency(product.priceInCents / 100)}
											</TableCell>
											<TableCell>{formatCurrency(total / 100)}</TableCell>
											{/* <TableCell>{cartTotal}</TableCell> */}
										</TableRow>
									);
								}
								return null;
							})}
						</TableBody>
					</Table>
				</CardContent>
				<CardFooter>
					<div className="flex justify-end w-full">
						<table className="text-right">
							<tr>
								<td>Cart Total:&nbsp;</td>
								<td>{formatCurrency(cartTotal / 100)}</td>
							</tr>
							<tr>
								<td>Shipping:&nbsp;</td>
								<td>{formatCurrency(shippingTotal / 100)}</td>
							</tr>
							<tr>
								<td>Tax:&nbsp;</td>
								<td>{formatCurrency(taxTotal / 100)}</td>
							</tr>
							<tr>
								<td>Order Total:&nbsp;</td>
								<td>{formatCurrency(orderTotal / 100)}</td>
							</tr>
						</table>
					</div>
				</CardFooter>
			</Card>
			<AddAddressForm
				clientSecret={paymentIntent.client_secret}
				orderTotal={orderTotal}
				user={authenticatedUser}
			/>
		</main>
	);
}
