import Link from 'next/link';
import {
	CircleAlert,
	FolderPlus,
	PackagePlus,
	TicketPercent,
	Truck,
	Users,
} from 'lucide-react';

import LocalTime from '@/components/local-time';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { getAdminOverview } from '@/db/admin-overview-db';
import { formatCurrency } from '@/lib/formatters';
import type { SalesPeriod } from '@/lib/sales-stats';
import { cn } from '@/lib/utils';
import ExportOrdersDialog from './orders/_components/export-orders-dialog';
import SalesChart from './_components/sales-chart';

const dollars = (cents: number) => formatCurrency(cents / 100);
const plural = (n: number, one: string, many = `${one}s`) =>
	`${n} ${n === 1 ? one : many}`;

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
					<CardTitle className="text-3xl font-semibold">{value}</CardTitle>
				</CardHeader>
				{note && (
					<CardContent className="text-sm text-muted-foreground">{note}</CardContent>
				)}
			</Card>
		</Link>
	);
}

// One sales period: money in, orders, and the change against the period before.
function SalesTile({
	label,
	period,
	versus,
	extra,
}: {
	label: string;
	period: SalesPeriod;
	versus: string;
	extra?: string;
}) {
	const change = period.changePercent;
	return (
		<Card className="shadow-warm-sm">
			<CardHeader className="gap-1 pb-2">
				<CardDescription>{label}</CardDescription>
				<p className="text-3xl font-semibold">{dollars(period.current.netInCents)}</p>
			</CardHeader>
			<CardContent className="flex flex-col gap-0.5 text-sm text-muted-foreground">
				<span>
					{plural(period.current.orders, 'order')}
					{extra ? ` · ${extra}` : ''}
				</span>
				<span>
					{change == null ? (
						period.current.netInCents > 0 ? (
							`No sales ${versus} to compare`
						) : (
							`Nothing ${versus} either`
						)
					) : (
						<>
							<span aria-hidden="true">{change > 0 ? '▲' : change < 0 ? '▼' : '='}</span>{' '}
							<span className="font-semibold text-foreground">
								{change > 0 ? '+' : ''}
								{change}%
							</span>{' '}
							vs {versus} ({dollars(period.previous.netInCents)})
						</>
					)}
				</span>
			</CardContent>
		</Card>
	);
}

const daysSince = (date: Date) =>
	Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));

export default async function AdminDashboardPage() {
	const overview = await getAdminOverview();
	const { sales, counts } = overview;

	const testMode = (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_test_');
	const emailOff = !process.env.RESEND_API_KEY;
	const waited = overview.oldestToShipAt ? daysSince(overview.oldestToShipAt) : null;

	const quickActions = [
		{ href: '/admin/products/new', label: 'Add product', icon: PackagePlus },
		{ href: '/admin/category/new', label: 'Add category', icon: FolderPlus },
		{ href: '/admin/discounts/new', label: 'Add discount code', icon: TicketPercent },
		{ href: '/admin/shipping', label: 'Shipping settings', icon: Truck },
		{ href: '/admin/customers', label: 'Customers', icon: Users },
	];

	return (
		<main className="mx-auto flex max-w-6xl flex-col gap-8">
			<header className="flex flex-col gap-3">
				<h1 className="text-center font-display text-3xl font-semibold">
					Admin Dashboard
				</h1>
				{(testMode || emailOff) && (
					<ul className="flex flex-col gap-2 text-sm">
						{testMode && (
							<li className="flex items-start gap-2 rounded-md bg-muted p-3">
								<CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
								<span>
									<strong>Payments are in Stripe test mode.</strong> Checkout works
									with test cards, but no real money moves.
								</span>
							</li>
						)}
						{emailOff && (
							<li className="flex items-start gap-2 rounded-md bg-muted p-3">
								<CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
								<span>
									<strong>Emails aren&apos;t being sent.</strong> No email service is
									connected, so order, shipping and account emails only appear in the
									server log.
								</span>
							</li>
						)}
					</ul>
				)}
			</header>

			<section aria-labelledby="needs-attention">
				<h2 id="needs-attention" className="mb-3 font-display text-xl font-semibold">
					Needs attention
				</h2>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<StatTile
						href="/admin/orders?status=shipping"
						label="Orders to ship"
						value={overview.ordersToShip}
						note={
							waited == null
								? 'All caught up'
								: waited === 0
									? 'Oldest placed today'
									: `Oldest waiting ${plural(waited, 'day')}`
						}
						attention={overview.ordersToShip > 0}
					/>
					<StatTile
						href="/admin/products?stock=out"
						label="Sold out"
						value={overview.soldOut}
						note={overview.soldOut > 0 ? 'Products with none left' : 'Nothing sold out'}
						attention={overview.soldOut > 0}
					/>
				</div>
			</section>

			<section aria-labelledby="sales-heading" className="flex flex-col gap-4">
				<div>
					<h2 id="sales-heading" className="font-display text-xl font-semibold">
						Sales
					</h2>
					<p className="text-sm text-muted-foreground">
						What customers paid (items, shipping and tax) less any refunds, counted
						on the day the order was placed, Eastern time.
					</p>
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					<SalesTile label="Today" period={sales.today} versus="yesterday" />
					<SalesTile
						label="Last 7 days"
						period={sales.week}
						versus="the 7 days before"
					/>
					<SalesTile
						label="This month"
						period={sales.month}
						versus="the same days last month"
						extra={
							sales.monthAverageInCents != null
								? `${dollars(sales.monthAverageInCents)} average`
								: undefined
						}
					/>
				</div>
				<Card className="shadow-warm-sm">
					<CardHeader className="pb-2">
						<CardTitle className="font-display text-lg">
							Daily sales, last 30 days
						</CardTitle>
					</CardHeader>
					<CardContent>
						<SalesChart daily={sales.daily} />
					</CardContent>
				</Card>
			</section>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<section aria-labelledby="recent-orders-heading" className="min-w-0">
					<Card className="h-full shadow-warm-sm">
						<CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
							<CardTitle id="recent-orders-heading" className="font-display text-xl">
								Recent orders
							</CardTitle>
							<Link href="/admin/orders" className="text-sm text-primary underline">
								View all orders
							</Link>
						</CardHeader>
						<CardContent>
							{overview.recentOrders.length === 0 ? (
								<p className="text-muted-foreground">No orders yet.</p>
							) : (
								<ul className="flex flex-col divide-y divide-border">
									{overview.recentOrders.map((order) => (
										<li key={order.id} className="py-3 first:pt-0 last:pb-0">
											<Link
												href={`/admin/orders/${order.id}`}
												className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md hover:bg-muted/50"
											>
												<span className="flex min-w-0 flex-col">
													<span className="font-semibold text-primary">
														#{order.id.slice(-8)}
													</span>
													<span className="break-all text-sm text-muted-foreground">
														{order.customerName ? `${order.customerName} · ` : ''}
														{order.customerEmail}
													</span>
													<span className="text-xs text-muted-foreground">
														<LocalTime value={order.createdAt} />
													</span>
												</span>
												<span className="flex items-center gap-3">
													<Badge
														variant={
															order.status === 'Refunded'
																? 'destructive'
																: order.status === 'Shipped'
																	? 'secondary'
																	: 'outline'
														}
														className="whitespace-nowrap"
													>
														{order.status}
													</Badge>
													<span className="font-semibold tabular-nums">
														{dollars(order.totalInCents)}
													</span>
												</span>
											</Link>
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>
				</section>

				<div className="flex min-w-0 flex-col gap-6">
					<section aria-labelledby="activity-heading">
						<Card className="shadow-warm-sm">
							<CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
								<CardTitle id="activity-heading" className="font-display text-xl">
									Recent activity
								</CardTitle>
								<Link href="/admin/activity" className="text-sm text-primary underline">
									View all activity
								</Link>
							</CardHeader>
							<CardContent>
								{overview.activity.length === 0 ? (
									<p className="text-muted-foreground">Nothing recorded yet.</p>
								) : (
									<ul className="flex flex-col divide-y divide-border text-sm">
										{overview.activity.map((entry) => (
											<li key={entry.id} className="py-2.5 first:pt-0 last:pb-0">
												<p className="break-words">
													{entry.orderId ? (
														<Link
															href={`/admin/orders/${entry.orderId}`}
															className="hover:underline"
														>
															{entry.summary}
														</Link>
													) : (
														entry.summary
													)}
												</p>
												<p className="text-xs text-muted-foreground">
													{entry.actorName || entry.actorEmail} &middot;{' '}
													<LocalTime value={entry.createdAt} />
												</p>
											</li>
										))}
									</ul>
								)}
							</CardContent>
						</Card>
					</section>

					<section aria-labelledby="glance-heading">
						<Card className="shadow-warm-sm">
							<CardHeader className="pb-2">
								<CardTitle id="glance-heading" className="font-display text-xl">
									Store at a glance
								</CardTitle>
							</CardHeader>
							<CardContent>
								<dl className="grid grid-cols-3 gap-4 text-sm">
									<div>
										<dt className="text-muted-foreground">Customers</dt>
										<dd className="text-2xl font-semibold">{counts.customers}</dd>
										<dd className="text-xs text-muted-foreground">
											{counts.newCustomers} new this month
										</dd>
									</div>
									<div>
										<dt className="text-muted-foreground">Products for sale</dt>
										<dd className="text-2xl font-semibold">{counts.productsForSale}</dd>
									</div>
									<div>
										<dt className="text-muted-foreground">Artists</dt>
										<dd className="text-2xl font-semibold">{counts.artists}</dd>
									</div>
								</dl>
							</CardContent>
						</Card>
					</section>
				</div>
			</div>

			<section aria-labelledby="quick-actions-heading">
				<h2 id="quick-actions-heading" className="mb-3 font-display text-xl font-semibold">
					Quick actions
				</h2>
				<div className="flex flex-wrap gap-3">
					{quickActions.map(({ href, label, icon: Icon }) => (
						<Button key={href} asChild variant="outline" className="rounded-full">
							<Link href={href}>
								<Icon className="mr-2 h-4 w-4" aria-hidden="true" />
								{label}
							</Link>
						</Button>
					))}
					<ExportOrdersDialog statusLabel="All" />
				</div>
			</section>
		</main>
	);
}
