'use client';

import { OrderProps } from '@/db/orders-db';
import { formatCurrency } from '@/lib/formatters';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import SortableHeader from '@/components/sortable-header';
import Link from 'next/link';
import { StickyNote } from 'lucide-react';

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
					variant={
						rank === 2 ? 'destructive' : rank === 1 ? 'secondary' : 'outline'
					}
				>
					{rank === 2 ? 'Refunded' : rank === 1 ? 'Fulfilled' : 'Processing'}
				</Badge>
			);
		},
	},
	{
		id: 'id',
		// the order number customers see on their Account page and in emails; the
		// search box looks at this value too, so "#" and the number both find it
		accessorFn: (order) => `#${order.id.slice(-8)}`,
		header: ({ column }) => <SortableHeader column={column} label="Order #" />,
		// plain text order: "alphanumeric" reads digit runs as numbers, so #9a… would
		// come before #66a… and look out of order
		sortingFn: 'text',
		cell: ({ row }) => {
			const { id } = row.original;
			return (
				<div>
					<Link
						href={`/admin/orders/${id}`}
						className="font-semibold text-primary"
					>
						{row.getValue('id') as string}
					</Link>
					{/* admins can see at a glance which orders have notes */}
					{(row.original.noteCount ?? 0) > 0 && (
						<span
							className="ml-2 inline-flex items-center gap-0.5 align-middle text-xs text-muted-foreground"
							title={`${row.original.noteCount} ${row.original.noteCount === 1 ? 'note' : 'notes'}`}
						>
							<StickyNote className="h-3.5 w-3.5" aria-hidden="true" />
							<span aria-hidden="true">{row.original.noteCount}</span>
							<span className="sr-only">
								{row.original.noteCount === 1
									? '1 note'
									: `${row.original.noteCount} notes`}
							</span>
						</span>
					)}
					{/* the Email and Created At columns are hidden on phones, so they ride along here */}
					<p className="break-all text-xs text-muted-foreground sm:hidden">
						{row.original.customerEmail}
					</p>
					<p className="text-xs text-muted-foreground sm:hidden">
						{new Date(row.original.createdAt).toLocaleDateString()}
					</p>
				</div>
			);
		},
	},
	{
		accessorKey: 'customerEmail',
		header: ({ column }) => <SortableHeader column={column} label="Email" />,
		sortingFn: 'alphanumeric',
		meta: { className: 'hidden sm:table-cell' },
		cell: ({ row }) => (
			// a sensible minimum width, so a normal address stays on one line
			<span className="block min-w-[12rem] break-all">
				{row.original.customerEmail}
			</span>
		),
	},
	{
		accessorKey: 'createdAt',
		header: ({ column }) => (
			<SortableHeader column={column} label="Created At" />
		),
		sortingFn: 'datetime',
		meta: { className: 'hidden sm:table-cell' },
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
