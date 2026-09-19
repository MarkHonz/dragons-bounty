'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';

import SortableHeader from '@/components/sortable-header';
import type { CustomerRow } from '@/db/user-db';

export const columns: ColumnDef<CustomerRow>[] = [
	{
		accessorKey: 'name',
		header: ({ column }) => <SortableHeader column={column} label="Name" />,
		sortingFn: 'alphanumeric',
		cell: ({ row }) => (
			<div className="break-words">{row.original.name ?? '—'}</div>
		),
	},
	{
		accessorKey: 'email',
		header: ({ column }) => <SortableHeader column={column} label="Email" />,
		sortingFn: 'alphanumeric',
		cell: ({ row }) => <div className="break-words">{row.original.email}</div>,
	},
	{
		accessorKey: 'cartId',
		header: 'Cart ID',
		enableSorting: false,
		cell: ({ row }) => (
			<div className="break-words text-muted-foreground">
				{row.original.cartId ?? '—'}
			</div>
		),
	},
	{
		id: 'view',
		cell: ({ row }) => (
			<div className="text-right">
				<Link
					href={`/admin/customers/${row.original.id}`}
					className="text-sm font-semibold text-primary"
				>
					View
				</Link>
			</div>
		),
	},
];
