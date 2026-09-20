'use client';

import { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import SortableHeader from '@/components/sortable-header';
import type { CategoryProps } from '@/db/category-db';
import CategoryActions from './category-actions';

// a category plus where it sits in the storefront order
export type CategoryRow = CategoryProps & { position: number; total: number };

export const columns: ColumnDef<CategoryRow>[] = [
	{
		accessorKey: 'position',
		header: ({ column }) => (
			<SortableHeader column={column} label="Position" shortLabel="#" />
		),
		sortDescFirst: false,
		cell: ({ row }) => (
			<span className="font-medium tabular-nums">{row.original.position}</span>
		),
	},
	{
		accessorKey: 'isActive',
		header: ({ column }) => <SortableHeader column={column} label="Active" />,
		cell: ({ row }) => {
			const isActive = row.getValue('isActive');

			return (
				<Badge variant={isActive ? 'secondary' : 'outline'}>
					{isActive ? 'Active' : 'Inactive'}
				</Badge>
			);
		},
	},
	{
		accessorKey: 'name',
		header: ({ column }) => <SortableHeader column={column} label="Name" />,
		sortingFn: 'alphanumeric',
		cell: ({ row }) => (
			<div>
				{row.original.name}
				{/* the Description column is hidden on phones */}
				{row.original.description && (
					<p className="line-clamp-2 text-xs text-muted-foreground sm:hidden">
						{row.original.description}
					</p>
				)}
			</div>
		),
	},
	{
		accessorKey: 'description',
		header: ({ column }) => (
			<SortableHeader column={column} label="Description" />
		),
		sortingFn: 'alphanumeric',
		meta: { className: 'hidden sm:table-cell' },
		cell: ({ row }) => (
			<div className="max-w-xs truncate text-muted-foreground">
				{(row.getValue('description') as string | null) || '—'}
			</div>
		),
	},
	{
		id: 'actions',
		cell: ({ row }) => <CategoryActions category={row.original} />,
	},
];
