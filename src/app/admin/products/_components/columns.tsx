'use client';

import { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';

import { ProductProps } from '@/db/product-db';
import { formatCurrency } from '@/lib/formatters';
import { getProductStockStatus } from '@/lib/stock';
import { hasVariants } from '@/lib/variants';
import ProductActions from './product-actions';
import ProductOptionsDialog from './product-options-dialog';
import SortableHeader from '@/components/sortable-header';

export const columns: ColumnDef<ProductProps>[] = [
	{
		accessorKey: 'isAvailable',
		header: ({ column }) => <SortableHeader column={column} label="Available" />,
		// phones: shown under the name instead
		meta: { className: 'hidden sm:table-cell' },
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
		accessorKey: 'isFeatured',
		header: ({ column }) => <SortableHeader column={column} label="Featured" />,
		// phones: shown under the name instead
		meta: { className: 'hidden sm:table-cell' },
		cell: ({ row }) =>
			row.original.isFeatured ? (
				<Badge variant="secondary">Featured</Badge>
			) : (
				<span className="text-muted-foreground">&mdash;</span>
			),
	},
	{
		accessorKey: 'name',
		header: ({ column }) => <SortableHeader column={column} label="Name" />,
		sortingFn: 'alphanumeric',
		cell: ({ row }) => (
			<div>
				{row.original.name}
				{/* the Category and Available columns are hidden on phones */}
				<p className="text-xs text-muted-foreground sm:hidden">
					{row.original.category.name}
					{!row.original.isAvailable && ' · Unavailable'}
					{row.original.isFeatured && ' · Featured'}
				</p>
			</div>
		),
	},
	{
		id: 'quantity',
		// a product with options is stocked per option: show and sort by the total
		accessorFn: (product) =>
			hasVariants(product)
				? product.variants.reduce((sum, variant) => sum + variant.quantity, 0)
				: product.quantity,
		header: ({ column }) => (
			<SortableHeader
				column={column}
				label="Quantity"
				shortLabel="Qty"
				align="center"
			/>
		),
		// first click sorts low to high, like Name sorts A to Z
		sortDescFirst: false,
		cell: ({ row }) => {
			const quantity = row.getValue('quantity') as number;
			const status = getProductStockStatus(row.original);
			const optionCount = row.original.variants.length;

			return (
				<div className="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-2">
					{quantity}
					{optionCount > 0 && <ProductOptionsDialog product={row.original} />}
					{status === 'low' && (
						<Badge variant="secondary" className="whitespace-nowrap px-2 sm:px-2.5">
							Low
						</Badge>
					)}
					{status === 'sold-out' && (
						<Badge variant="destructive" className="whitespace-nowrap px-2 sm:px-2.5">
							Sold out
						</Badge>
					)}
				</div>
			);
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
		meta: { className: 'hidden sm:table-cell' },
	},
	{
		id: 'actions',
		cell: ({ row }) => <ProductActions product={row.original} />,
	},
];
