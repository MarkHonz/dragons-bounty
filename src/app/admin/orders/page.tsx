import {
	getOrders,
	getOrderStatusCounts,
	OrderProps,
	parseOrderStatusFilter,
} from '@/db/orders-db';
import { DataTable } from '@/components/data-table';
import FilterTabs from '@/components/filter-tabs';
import { columns } from './_components/columns';
import { Card } from '@/components/ui/card';
import ExportOrdersDialog from './_components/export-orders-dialog';

type Props = {
	searchParams: { status?: string };
};

export default async function AdminOrdersPage({ searchParams }: Props) {
	const status = parseOrderStatusFilter(searchParams.status);
	const [orders, counts] = await Promise.all([
		getOrders(status) as Promise<OrderProps[]>,
		getOrderStatusCounts(),
	]);

	return (
		<main className="mx-auto max-w-5xl">
			<header className="mb-6 flex items-center justify-between gap-4">
				<h1 className="font-display text-3xl font-semibold">Orders</h1>
				{counts.all > 0 && (
					<ExportOrdersDialog
						status={status}
						statusLabel={
							status === 'shipping'
								? 'Needs shipping'
								: status === 'fulfilled'
									? 'Fulfilled'
									: status === 'refunded'
										? 'Refunded'
										: 'All'
						}
					/>
				)}
			</header>
			{counts.all === 0 ? (
				<h2 className="p-2 text-center text-muted-foreground">
					No orders found
				</h2>
			) : (
				<>
					<FilterTabs
						label="Filter orders"
						options={[
							{ label: 'All', href: '/admin/orders', count: counts.all, active: !status },
							{
								label: 'Needs shipping',
								href: '/admin/orders?status=shipping',
								count: counts.shipping,
								active: status === 'shipping',
							},
							{
								label: 'Fulfilled',
								href: '/admin/orders?status=fulfilled',
								count: counts.fulfilled,
								active: status === 'fulfilled',
							},
							{
								label: 'Refunded',
								href: '/admin/orders?status=refunded',
								count: counts.refunded,
								active: status === 'refunded',
							},
						]}
					/>
					<Card className="p-2 shadow-warm-sm">
						<DataTable
							// a new filter starts the table fresh (search, sort and page)
							key={status ?? 'all'}
							columns={columns}
							data={orders}
							searchColumns={['id', 'customerEmail']}
							searchPlaceholder="Search by order ID or email"
							// newest orders first
							initialSorting={[{ id: 'createdAt', desc: true }]}
						/>
					</Card>
				</>
			)}
		</main>
	);
}
