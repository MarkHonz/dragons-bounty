import React from 'react';
import Link from 'next/link';
import { getUserById } from '@/db/user-db';
import { getOrdersByProfileId, OrderProps } from '@/db/orders-db';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/formatters';
import { verifyAuthSession } from '@/lib/auth';
import AccountControls from './_components/account-controls';

export default async function AdminCustomerDetailPage({
	params,
}: {
	params: { userId: string };
}) {
	const user = await getUserById(params.userId);

	if (!user) {
		return (
			<main className="mx-auto max-w-xl">
				<h2 className="text-xl font-semibold">Customer not found</h2>
				<Link href="/admin/customers" className="text-sm text-primary">
					Back to users
				</Link>
			</main>
		);
	}

	const { user: sessionUser } = await verifyAuthSession();
	const orderRows = user.profile?.id
		? ((await getOrdersByProfileId(user.profile.id)) as OrderProps[])
		: [];
	const hasOrders = Array.isArray(orderRows) && orderRows.length > 0;

	const address = user.profile
		? [
				user.profile.address1,
				user.profile.address2,
				user.profile.city,
				user.profile.state,
				user.profile.zip,
		  ]
				.filter(Boolean)
				.join(', ')
		: null;

	return (
		<main className="mx-auto max-w-xl">
			<header className="mb-6 flex items-center justify-between">
				<h1 className="font-display text-3xl font-semibold">Customer</h1>
				<Link href="/admin/customers" className="text-sm text-primary">
					Back to users
				</Link>
			</header>

			<Card className="shadow-warm-sm">
				<CardContent className="space-y-4 pt-6">
					<div>
						<div className="text-sm text-muted-foreground">Name</div>
						<div className="text-lg font-semibold">
							{user.profile?.name ?? '—'}
						</div>
					</div>

					<div>
						<div className="text-sm text-muted-foreground">Email</div>
						<div className="text-lg font-semibold">{user.email}</div>
					</div>

					<div>
						<div className="text-sm text-muted-foreground">Address</div>
						<div className="text-lg font-semibold">
							{address ?? 'No address on file'}
						</div>
					</div>

					<div>
						<div className="text-sm text-muted-foreground">Cart ID</div>
						<div className="text-lg font-semibold">
							{user.profile?.Cart?.id ?? '—'}
						</div>
					</div>

					<AccountControls
						userId={user.id}
						label={user.profile?.name || user.email}
						isAdmin={user.role === 'ADMIN'}
						emailVerified={user.emailVerified}
						isSelf={sessionUser?.id === user.id}
						hasOrders={hasOrders}
					/>
				</CardContent>
			</Card>

			<section className="mt-8">
				<h2 className="mb-4 font-display text-2xl font-semibold">
					Order history
				</h2>
				{user.profile?.id ? (
					<UserOrders profileId={user.profile.id} />
				) : (
					<Card className="p-4 text-muted-foreground shadow-warm-sm">
						No orders available
					</Card>
				)}
			</section>
		</main>
	);
}

async function UserOrders({ profileId }: { profileId: string }) {
	const orders = (await getOrdersByProfileId(profileId)) as OrderProps[];

	if (!orders || orders.length === 0) {
		return (
			<Card className="p-4 text-muted-foreground shadow-warm-sm">
				No orders found for this customer.
			</Card>
		);
	}

	return (
		<Card className="overflow-x-auto p-2 shadow-warm-sm">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Order</TableHead>
						<TableHead>Date</TableHead>
						<TableHead>Total</TableHead>
						<TableHead>Status</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{orders.map((order) => (
						<TableRow key={order.id}>
							<TableCell>
								<Link
									href={`/admin/orders/${order.id}`}
									className="font-semibold text-primary"
								>
									#{order.id.slice(-8)}
								</Link>
							</TableCell>
							<TableCell>
								{new Date(order.createdAt).toLocaleString()}
							</TableCell>
							<TableCell>{formatCurrency(order.totalInCents / 100)}</TableCell>
							<TableCell>
								<Badge
									variant={
										order.refundedAt
											? 'destructive'
											: order.fulfilled
												? 'secondary'
												: 'outline'
									}
								>
									{order.refundedAt
										? 'Refunded'
										: order.fulfilled
											? 'Fulfilled'
											: 'Pending'}
								</Badge>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</Card>
	);
}
