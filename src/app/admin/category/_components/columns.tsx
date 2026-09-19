'use client';

import { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import SortableHeader from '@/components/sortable-header';
import type { CategoryProps } from '@/db/category-db';
import CategoryActions from './category-actions';

export const columns: ColumnDef<CategoryProps>[] = [
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
	},
	{
		accessorKey: 'description',
		header: ({ column }) => (
			<SortableHeader column={column} label="Description" />
		),
		sortingFn: 'alphanumeric',
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
