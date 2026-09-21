'use client';

import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';

import SortableHeader from '@/components/sortable-header';
import { formatCurrency } from '@/lib/formatters';

// The few things the orders list shows. It is handed to a client component, so
// nothing else about the order (address, payment id...) is sent.
export type CustomerOrderRow = {
	id: string;
	createdAt: Date;
	totalInCents: number;
	fulfilled: boolean;
	refundedAt: Date | null;
};

const statusLabel = (order: CustomerOrderRow) =>
	order.refundedAt ? 'Refunded' : order.fulfilled ? 'Shipped' : 'Processing';

// sorting puts orders still on their way first, then shipped, then refunded
const statusRank = (order: CustomerOrderRow) =>
	order.refundedAt ? 2 : order.fulfilled ? 1 : 0;

export const columns: ColumnDef<CustomerOrderRow>[] = [
	{
		accessorKey: 'createdAt',
		header: ({ column }) => (
			<SortableHeader column={column} label="Order Date" shortLabel="Date" />
		),
		sortingFn: 'datetime',
		cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
	},
	{
		id: 'id',
		// the order number shown on the Account page and in emails; the search box
		// looks at this value, so "#" and the number both find it
		accessorFn: (order) => `#${order.id.slice(-8)}`,
		header: ({ column }) => (
			<SortableHeader column={column} label="Order Number" shortLabel="Number" />
		),
		// plain text order: "alphanumeric" reads digit runs as numbers, so #9a… would
		// come before #66a… and look out of order
		sortingFn: 'text',
		cell: ({ row }) => (
			<div>
				<Link
					href={`/orders/${row.original.id}`}
					className="font-semibold text-primary underline"
				>
					{row.getValue('id') as string}
				</Link>
				{/* the Status column is hidden on phones, so it rides along here */}
				<p className="text-xs text-muted-foreground sm:hidden">
					{statusLabel(row.original)}
				</p>
			</div>
		),
	},
	{
		id: 'status',
		// the label is what the search box matches ("shipped", "refund"...)
		accessorFn: statusLabel,
		header: ({ column }) => (
			<SortableHeader column={column} label="Order Status" />
		),
		sortingFn: (a, b) => statusRank(a.original) - statusRank(b.original),
		sortDescFirst: false,
		meta: { className: 'hidden sm:table-cell' },
	},
	{
		accessorKey: 'totalInCents',
		header: ({ column }) => (
			<SortableHeader
				column={column}
				label="Order Total"
				shortLabel="Total"
				align="right"
			/>
		),
		sortDescFirst: false,
		cell: ({ row }) => (
			<div className="text-right font-medium">
				{formatCurrency(row.original.totalInCents / 100)}
			</div>
		),
	},
];
