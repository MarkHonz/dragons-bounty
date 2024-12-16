'use client';

import { ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, XCircle, MoreVertical } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { ProductProps } from '@/db/product-db';
import { formatCurrency } from '@/lib/formatters';
import ProductToggleAvailable from './product-toggle-available';
import ProductDelete from './product-delete';
import Link from 'next/link';

export const columns: ColumnDef<ProductProps>[] = [
	{
		accessorKey: 'isAvailable',
		header: () => <div className="text-right">Available</div>,
		cell: ({ row }) => {
			const isAvailable = row.getValue('isAvailable');

			return <div>{isAvailable ? <CheckCircle2 /> : <XCircle />}</div>;
		},
	},
	{
		accessorKey: 'name',
		header: 'Name',
	},
	{
		accessorKey: 'quantity',
		header: () => <div className="text-left">Quantity</div>,
		cell: ({ row }) => {
			const quantity = row.getValue('quantity') as number;

			return <div className="text-center">{quantity}</div>;
		},
	},
	{
		accessorKey: 'priceInCents',
		header: () => <div className="text-right">Amount</div>,
		cell: ({ row }) => {
			const amount = Number(row.getValue('priceInCents'));
			const formatted = formatCurrency(amount / 100);

			return <div className="text-right font-medium">{formatted}</div>;
		},
	},
	{
		accessorKey: 'category.name',
		header: 'Category',
	},
	{
		id: 'actions',
		cell: ({ row }) => {
			const product = row.original;

			return (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<span className="sr-only">Open menu</span>
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<Link href={`/admin/products/${product.id}/edit`}>
							<DropdownMenuItem>Edit</DropdownMenuItem>
						</Link>
						<ProductToggleAvailable
							product={{ id: product.id, isActive: product.isAvailable }}
						/>
						<ProductDelete id={product.id} imagePath={product.imagePath} />
						<DropdownMenuSeparator />
					</DropdownMenuContent>
				</DropdownMenu>
			);
		},
	},
];
