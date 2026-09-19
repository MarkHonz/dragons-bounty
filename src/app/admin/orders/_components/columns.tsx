'use client';

import { OrderProps } from '@/db/orders-db';
import { formatCurrency } from '@/lib/formatters';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import SortableHeader from '@/components/sortable-header';
import Link from 'next/link';

export const columns: ColumnDef<OrderProps>[] = [
	{
		id: 'status',
		// ranked so that sorting puts orders still needing attention first
		accessorFn: (order) => (order.refundedAt ? 2 : order.fulfilled ? 1 : 0),
		header: ({ column }) => <SortableHeader column={column} label="Status" />,
		sortDescFirst: false,
		cell: ({ row }) => {
			const rank = row.getValue('status') as number;

			return (
				<Badge
					variant={rank === 2 ? 'destructive' : rank === 1 ? 'secondary' : 'outline'}
				>
					{rank === 2 ? 'Refunded' : rank === 1 ? 'Fulfilled' : 'Processing'}
				</Badge>
			);
		},
	},
	{
		accessorKey: 'id',
		header: ({ column }) => <SortableHeader column={column} label="Order ID" />,
		sortingFn: 'alphanumeric',
		cell: ({ row }) => {
			const id = row.getValue('id') as string;
			return (
				<div>
					<Link href={`/admin/orders/${id}`} className="font-semibold text-primary">
						{id}
					</Link>
				</div>
			);
		},
	},
	{
		accessorKey: 'createdAt',
		header: ({ column }) => (
			<SortableHeader column={column} label="Created At" />
		),
		sortingFn: 'datetime',
		cell: ({ row }) => {
			const createdAt = row.getValue('createdAt') as Date;
			return new Date(createdAt).toLocaleDateString();
		},
	},
	{
		accessorKey: 'totalInCents',
		header: ({ column }) => (
			<SortableHeader column={column} label="Total" align="right" />
		),
		sortDescFirst: false,
		cell: ({ row }) => {
			const total = Number(row.getValue('totalInCents'));
			const formatted = formatCurrency(total / 100);

			return <div className="text-right font-medium">{formatted}</div>;
		},
	},
];
