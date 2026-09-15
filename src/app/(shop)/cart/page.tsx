import Link from 'next/link';
import CartTable from './_components/cart-table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { verifyAuthSession } from '@/lib/auth';
import { getEnrichedCartByUserId } from '@/db/cart-db';

export default async function CartPage() {
	// get the authenticated user
	const sessionUserId = await verifyAuthSession();
	let authenticatedUser = '';
	if (sessionUserId.user !== null) {
		authenticatedUser = sessionUserId.user.id;
	} else {
		authenticatedUser = 'guest';
	}

	const initialItems =
		authenticatedUser !== 'guest'
			? (await getEnrichedCartByUserId(authenticatedUser)).items
			: null;

	return (
		<main className="mx-auto flex max-w-xl flex-col items-center px-5 py-10 sm:px-10">
			<h1 className="mb-6 font-display text-3xl font-semibold">Your Cart</h1>
			<Card className="w-full p-4 shadow-warm-sm sm:p-6">
				<CartTable user={authenticatedUser} initialItems={initialItems} />
			</Card>
			<div className="mt-6">
				<Button asChild size="lg" className="rounded-full">
					<Link href="/checkout">Checkout</Link>
				</Button>
			</div>
		</main>
	);
}
