import { getOrders, OrderProps } from '@/db/orders-db';
import { DataTable } from '@/components/data-table';
import { columns } from './_components/columns';
import { Card } from '@/components/ui/card';

export default async function AdminOrdersPage() {
	const orders = (await getOrders()) as OrderProps[];

	return (
		<main className="mx-auto max-w-4xl">
			<header className="mb-6 flex items-center justify-between gap-4">
				<h1 className="font-display text-3xl font-semibold">Orders</h1>
			</header>
			{orders.length === 0 ? (
				<h2 className="p-2 text-center text-muted-foreground">
					No orders found
				</h2>
			) : (
				<Card className="p-2 shadow-warm-sm">
					<DataTable
						columns={columns}
						data={orders}
						searchColumns={['id']}
						searchPlaceholder="Search by order ID"
						// newest orders first
						initialSorting={[{ id: 'createdAt', desc: true }]}
					/>
				</Card>
			)}
		</main>
	);
}
