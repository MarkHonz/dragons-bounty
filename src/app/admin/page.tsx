import Link from 'next/link';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { getAdminOverview } from '@/db/admin-overview-db';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

type StatTileProps = {
	href: string;
	label: string;
	value: string | number;
	note?: string;
	// highlight the tile when there is something to do
	attention?: boolean;
};

function StatTile({ href, label, value, note, attention }: StatTileProps) {
	return (
		<Link
			href={href}
			className="rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
		>
			<Card
				className={cn(
					'h-full shadow-warm-sm transition-colors hover:bg-muted/50',
					attention && 'border-primary'
				)}
			>
				<CardHeader className="pb-1">
					<CardDescription>{label}</CardDescription>
					<CardTitle className="font-display text-3xl">{value}</CardTitle>
				</CardHeader>
				{note && (
					<CardContent className="text-sm text-muted-foreground">
						{note}
					</CardContent>
				)}
			</Card>
		</Link>
	);
}

export default async function AdminDashboardPage() {
	const overview = await getAdminOverview();

	return (
		<>
			<h1 className="text-center font-display text-3xl font-semibold">
				Admin Dashboard
			</h1>
			<section aria-labelledby="needs-attention" className="mt-6">
				<h2
					id="needs-attention"
					className="mb-3 font-display text-xl font-semibold"
				>
					Needs attention
				</h2>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<StatTile
						href="/admin/orders?status=shipping"
						label="Orders to ship"
						value={overview.ordersToShip}
						attention={overview.ordersToShip > 0}
					/>
					<StatTile
						href="/admin/products?stock=out"
						label="Sold out"
						value={overview.soldOut}
						attention={overview.soldOut > 0}
					/>
					<StatTile
						href="/admin/orders"
						label="Today's sales"
						value={formatCurrency(overview.todaySalesInCents / 100)}
						note={`${overview.todayOrders} ${overview.todayOrders === 1 ? 'order' : 'orders'}`}
					/>
				</div>
			</section>
			<div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				<Card className="shadow-warm-sm">
					<CardHeader>
						<CardTitle className="font-display text-xl">Users</CardTitle>
					</CardHeader>
					<CardContent>
						<CardDescription>Manage users</CardDescription>
					</CardContent>
				</Card>
				<Card className="shadow-warm-sm">
					<CardHeader>
						<CardTitle className="font-display text-xl">Products</CardTitle>
					</CardHeader>
					<CardContent>
						<CardDescription>Manage products</CardDescription>
					</CardContent>
				</Card>
				<Card className="shadow-warm-sm">
					<CardHeader>
						<CardTitle className="font-display text-xl">Orders</CardTitle>
					</CardHeader>
					<CardContent>
						<CardDescription>Manage orders</CardDescription>
					</CardContent>
				</Card>
			</div>
		</>
	);
}
