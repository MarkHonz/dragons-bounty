'use client';

import { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import SortableHeader from '@/components/sortable-header';
import type { DiscountCodeRow } from '@/db/discount-db';
import { formatCurrency } from '@/lib/formatters';
import { describeDiscount } from '@/lib/pricing';
import DiscountActions from './discount-actions';

export const columns: ColumnDef<DiscountCodeRow>[] = [
	{
		accessorKey: 'isActive',
		header: ({ column }) => <SortableHeader column={column} label="Active" />,
		cell: ({ row }) => (
			<Badge variant={row.original.isActive ? 'secondary' : 'outline'}>
				{row.original.isActive ? 'Active' : 'Inactive'}
			</Badge>
		),
	},
	{
		accessorKey: 'code',
		header: ({ column }) => <SortableHeader column={column} label="Code" />,
		sortingFn: 'alphanumeric',
		cell: ({ row }) => (
			<div>
				<span className="font-semibold">{row.original.code}</span>
				{/* the Discount column is hidden on phones */}
				<p className="text-xs text-muted-foreground sm:hidden">
					{describeDiscount(row.original, (cents) =>
						formatCurrency(cents / 100)
					)}
				</p>
			</div>
		),
	},
	{
		id: 'discount',
		header: 'Discount',
		meta: { className: 'hidden sm:table-cell' },
		cell: ({ row }) =>
			describeDiscount(row.original, (cents) => formatCurrency(cents / 100)),
	},
	{
		accessorKey: 'oncePerCustomer',
		header: 'Limit',
		meta: { className: 'hidden md:table-cell' },
		cell: ({ row }) =>
			row.original.oncePerCustomer ? 'Once per customer' : '—',
	},
	{
		accessorKey: 'uses',
		header: ({ column }) => <SortableHeader column={column} label="Uses" />,
		cell: ({ row }) => (
			<span className="tabular-nums">{row.original.uses}</span>
		),
	},
	{
		id: 'actions',
		cell: ({ row }) => <DiscountActions code={row.original} />,
	},
];
