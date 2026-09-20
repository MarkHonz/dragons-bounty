import Link from 'next/link';
import CartTable from './_components/cart-table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { verifyAuthSession } from '@/lib/auth';
import { getEnrichedCartByUserId } from '@/db/cart-db';
import { getCartDiscount, getShippingRates } from '@/db/discount-db';
import {
	calculateTotals,
	describeDiscount,
	isChargeable,
	MINIMUM_CHARGE_IN_CENTS,
} from '@/lib/pricing';
import { formatCurrency } from '@/lib/formatters';
import OrderTotals, { discountRows } from '@/components/order-totals';
import DiscountCodeBox from './_components/discount-code-box';

export default async function CartPage() {
	// get the authenticated user
	const sessionUserId = await verifyAuthSession();
	let authenticatedUser = '';
	if (sessionUserId.user !== null) {
		authenticatedUser = sessionUserId.user.id;
	} else {
		authenticatedUser = 'guest';
	}

	const cart =
		authenticatedUser !== 'guest'
			? await getEnrichedCartByUserId(authenticatedUser)
			: null;
	const initialItems = cart ? cart.items : null;

	// The code in the cart and what the order comes to with it. The checkout page
	// works these out the same way, from the same code.
	const hasItems = (initialItems ?? []).length > 0;
	const discount =
		cart && hasItems
			? await getCartDiscount(cart.cartId, authenticatedUser)
			: null;
	const totals =
		cart && hasItems
			? calculateTotals({
					itemsInCents: cart.items.reduce(
						(sum, item) => sum + item.price * item.quantity,
						0
					),
					discount: discount?.rule ?? null,
					shipping: await getShippingRates(),
				})
			: null;
	const tooSmall = totals !== null && !isChargeable(totals.totalInCents);

	// a line that is no longer for sale, sold out or over stock can't be checked
	// out; the cart table says which, and the checkout page turns the customer
	// back if they try anyway
	const hasStockProblem = (initialItems ?? []).some(
		(item) =>
			item.isAvailable === false ||
			(item.numberInStock != null &&
				(item.numberInStock <= 0 || item.quantity > item.numberInStock))
	);

	return (
		<main className="mx-auto flex max-w-3xl flex-col items-center px-5 py-10 sm:px-10">
			<h1 className="mb-6 font-display text-3xl font-semibold">Your Cart</h1>
			<Card className="w-full p-4 shadow-warm-sm sm:p-6">
				<CartTable user={authenticatedUser} initialItems={initialItems} />
			</Card>
			{totals && discount && (
				<Card className="mt-4 flex w-full flex-col gap-4 p-4 shadow-warm-sm sm:p-6">
					<DiscountCodeBox
						appliedCode={discount.code}
						appliedDescription={
							discount.rule
								? describeDiscount(discount.rule, (cents) =>
										formatCurrency(cents / 100)
									)
								: null
						}
						problem={discount.problem}
					/>
					<OrderTotals
						rows={[
							{
								label: 'Items',
								value: formatCurrency(totals.itemsInCents / 100),
							},
							...discountRows({
								discountCode: discount.rule ? discount.code : null,
								discountInCents: totals.discountInCents,
							}),
							{
								label: 'Shipping',
								value:
									totals.shippingInCents === 0
										? 'Free'
										: formatCurrency(totals.shippingInCents / 100),
							},
							{
								label: 'Estimated tax',
								value: formatCurrency(totals.taxInCents / 100),
							},
							{
								label: 'Total',
								value: formatCurrency(totals.totalInCents / 100),
								emphasis: true,
							},
						]}
					/>
				</Card>
			)}
			<div className="mt-6 flex flex-col items-center gap-2">
				{hasStockProblem || discount?.problem || tooSmall ? (
					<>
						<Button size="lg" className="rounded-full" disabled>
							Checkout
						</Button>
						<p className="text-sm text-destructive">
							{hasStockProblem
								? 'Fix the items marked above to check out.'
								: discount?.problem
									? 'Remove the discount code above to check out.'
									: `Orders must total at least ${formatCurrency(MINIMUM_CHARGE_IN_CENTS / 100)} to pay by card.`}
						</p>
					</>
				) : (
					<Button asChild size="lg" className="rounded-full">
						<Link href="/checkout">Checkout</Link>
					</Button>
				)}
			</div>
		</main>
	);
}
