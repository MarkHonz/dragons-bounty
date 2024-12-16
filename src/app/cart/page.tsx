// import { verifyAuthSession } from '@/lib/auth';
import Link from 'next/link';
import CartTable from './_components/cart-table';
import { Card } from '@/components/ui/card';

export default async function CartPage() {
	// get the authenticated user
	// const sessionUserId = await verifyAuthSession();
	// let authenticatedUser = '';
	// if (sessionUserId.user !== null) {
	// 	authenticatedUser = sessionUserId.user.id;
	// } else {
	// 	authenticatedUser = 'guest';
	// }

	return (
		<main className="flex flex-col justify-center items-center max-w-lg m-auto">
			<h1 className="text-4xl font-semibold p-3 mt-5">Cart</h1>
			<Card className="p-3 m-3">
				<CartTable />
			</Card>
			<div className="flex justify-center items-center mt-5">
				<Link
					href="/checkout"
					className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
				>
					Checkout
				</Link>
			</div>
		</main>
	);
}
