import { Card } from '@/components/ui/card';
import { getOrdersByProfileId, OrderProps } from '@/db/orders-db';
import { getProfileIdByUserId } from '@/db/user-db';
import { verifyAuthSession } from '@/lib/auth';
import { DataTable } from '@/components/data-table';
import Link from 'next/link';
import { columns, CustomerOrderRow } from './_components/columns';

export default async function OrdersPage() {
	// get the authenticated user
	const sessionUserId = await verifyAuthSession();
	let authenticatedUser = '';
	if (sessionUserId.user !== null) {
		authenticatedUser = sessionUserId.user.id;
	} else {
		authenticatedUser = 'guest';
	}

	// get the user's profile id
	const profileId = (await getProfileIdByUserId(authenticatedUser)) as string;

	// get the user's orders
	const orders = (await getOrdersByProfileId(profileId)) as OrderProps[];

	if (authenticatedUser === 'guest') {
		return (
			<main className="mx-auto flex max-w-lg flex-col items-center px-5 py-14 text-center sm:px-10">
				<h1 className="mb-3 font-display text-3xl font-semibold">Orders</h1>
				<p className="text-muted-foreground">
					Please log in to view your orders.
				</p>
			</main>
		);
	}

	// only what the table shows is handed to the browser
	const rows: CustomerOrderRow[] = orders.map((order) => ({
		id: order.id,
		createdAt: order.createdAt,
		totalInCents: order.totalInCents,
		fulfilled: Boolean(order.fulfilled),
		refundedAt: order.refundedAt ?? null,
	}));

	return (
		<main className="mx-auto flex max-w-3xl flex-col items-center px-5 py-10 sm:px-10">
			<h1 className="mb-6 font-display text-3xl font-semibold">Orders</h1>
			<Card className="w-full p-3 shadow-warm-sm sm:p-4">
				{rows.length === 0 ? (
					<p className="p-4 text-center text-muted-foreground">
						You haven&apos;t placed any orders yet.{' '}
						<Link href="/" className="font-semibold text-primary underline">
							Start shopping
						</Link>
					</p>
				) : (
					<DataTable
						columns={columns}
						data={rows}
						searchColumns={['id', 'status']}
						searchPlaceholder="Search by order # or status"
						// newest orders first
						initialSorting={[{ id: 'createdAt', desc: true }]}
					/>
				)}
			</Card>
		</main>
	);
}
