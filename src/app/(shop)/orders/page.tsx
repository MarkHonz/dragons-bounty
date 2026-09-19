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

const orderStatus = (order: OrderProps) =>
	order.refundedAt ? 'Refunded' : order.fulfilled ? 'Shipped' : 'Processing';

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

	return (
		<main className="mx-auto flex max-w-3xl flex-col items-center px-5 py-10 sm:px-10">
			<h1 className="mb-6 font-display text-3xl font-semibold">Orders</h1>
			<Card className="w-full p-4 shadow-warm-sm sm:p-6">
				<div className="flex flex-col divide-y divide-border sm:hidden">
					{orders.map((order: OrderProps) => (
						<div key={order.id} className="flex flex-col gap-1 py-4">
							<div className="flex items-center justify-between gap-3">
								<span className="font-semibold">
									{order.createdAt.toLocaleDateString()}
								</span>
								<span className="text-sm text-muted-foreground">
									{orderStatus(order)}
								</span>
							</div>
							<Link
								href={`/orders/${order.id}`}
								className="break-all text-sm text-primary underline"
							>
								{order.id}
							</Link>
							<span className="font-semibold">
								{formatCurrency(order.totalInCents / 100)}
							</span>
						</div>
					))}
				</div>
				<Table className="hidden sm:table">
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
														return (
								<TableRow key={order.id}>
									<TableCell>{order.createdAt.toLocaleDateString()}</TableCell>
									<TableCell>
										{<Link href={`/orders/${order.id}`}>{order.id}</Link>}
									</TableCell>
									<TableCell>
										{formatCurrency(order.totalInCents / 100)}
									</TableCell>
									<TableCell>{orderStatus(order)}</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</Card>
		</main>
	);
}
