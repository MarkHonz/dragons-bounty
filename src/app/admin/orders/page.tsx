import { getUnfulfilledOrders, OrderProps } from '@/db/orders-db';
import { OrderTable } from './_components/order-table';
import { columns } from './_components/columns';
import { Card } from '@/components/ui/card';

export default async function AdminOrdersPage() {
	const orders = (await getUnfulfilledOrders()) as OrderProps[];

	return (
		<main className="mx-auto max-w-3xl">
			<header className="mb-6 flex items-center justify-between gap-4">
				<h1 className="font-display text-3xl font-semibold">Orders</h1>
			</header>
			{orders.length === 0 ? (
				<h2 className="p-2 text-center text-muted-foreground">
					No orders found
				</h2>
			) : (
				<Card className="p-2 shadow-warm-sm">
					<OrderTable columns={columns} data={orders} />
				</Card>
			)}
		</main>
	);
}
