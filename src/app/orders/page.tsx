import { deleteAllOrderProducts } from '@/actions/order-actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { getOrdersByProfileId, OrderProps } from '@/db/orders-db';
import { getProfileIdByUserId } from '@/db/user-db';
import { verifyAuthSession } from '@/lib/auth';
import { formatCurrency } from '@/lib/formatters';
import Link from 'next/link';

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
	console.log('Profile Id :', profileId);

	// get the user's orders
	const orders = (await getOrdersByProfileId(profileId)) as OrderProps[];

	if (authenticatedUser === 'guest') {
		return (
			<main className="flex flex-col justify-center items-center max-w-lg m-auto">
				<h1 className="text-4xl mb-4 p-3">Orders</h1>
				<p className="text-lg">Please log in to view your orders.</p>
			</main>
		);
	}

	return (
		<main className="flex flex-col justify-center items-center max-w-lg m-auto">
			<h1 className="text-4xl mb-4 p-3">Orders</h1>
			<Card className="p-3 m-3">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Order Date</TableHead>
							<TableHead>Order Number</TableHead>
							<TableHead>Order Total</TableHead>
							<TableHead>Order Status</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{orders.map((order: OrderProps) => {
							const orderFulfilled = order.fulfilled ? 'Shipped' : 'Processing';
							return (
								<TableRow key={order.id}>
									<TableCell>{order.createdAt.toLocaleDateString()}</TableCell>
									<TableCell>
										{<Link href={`/orders/${order.id}`}>{order.id}</Link>}
									</TableCell>
									<TableCell>
										{formatCurrency(order.totalInCents / 100)}
									</TableCell>
									<TableCell>{orderFulfilled}</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</Card>
			<form action={deleteAllOrderProducts}>
				<Button>Delete All Orders</Button>
			</form>
		</main>
	);
}
