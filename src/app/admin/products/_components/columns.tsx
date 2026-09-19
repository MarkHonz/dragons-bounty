'use client';

import { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';

import { ProductProps } from '@/db/product-db';
import { formatCurrency } from '@/lib/formatters';
import ProductActions from './product-actions';
import SortableHeader from '@/components/sortable-header';

export const columns: ColumnDef<ProductProps>[] = [
	{
		accessorKey: 'isAvailable',
		header: ({ column }) => <SortableHeader column={column} label="Available" />,
		cell: ({ row }) => {
			const isAvailable = row.getValue('isAvailable');

			return (
				<Badge variant={isAvailable ? 'secondary' : 'outline'}>
					{isAvailable ? 'Available' : 'Unavailable'}
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
		accessorKey: 'quantity',
		header: ({ column }) => (
			<SortableHeader column={column} label="Quantity" align="center" />
		),
		// first click sorts low to high, like Name sorts A to Z
		sortDescFirst: false,
		cell: ({ row }) => {
			const quantity = row.getValue('quantity') as number;

			return <div className="text-center">{quantity}</div>;
		},
	},
	{
		accessorKey: 'priceInCents',
		header: ({ column }) => (
			<SortableHeader column={column} label="Amount" align="right" />
		),
		sortDescFirst: false,
		cell: ({ row }) => {
			const amount = Number(row.getValue('priceInCents'));
			const formatted = formatCurrency(amount / 100);

			return <div className="text-right font-medium">{formatted}</div>;
		},
	},
	{
		accessorKey: 'category.name',
		header: ({ column }) => <SortableHeader column={column} label="Category" />,
		sortingFn: 'alphanumeric',
	},
	{
		id: 'actions',
		cell: ({ row }) => <ProductActions product={row.original} />,
	},
];
