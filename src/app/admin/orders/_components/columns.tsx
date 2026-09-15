'use client';

import { OrderProps } from '@/db/orders-db';
import { formatCurrency } from '@/lib/formatters';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export const columns: ColumnDef<OrderProps>[] = [
	{
		accessorKey: 'fulfilled',
		header: () => <div className="text-left">Fulfilled</div>,
		cell: ({ row }) => {
			const isOrderFulfilled = row.getValue('fulfilled');

			return (
				<Badge variant={isOrderFulfilled ? 'secondary' : 'outline'}>
					{isOrderFulfilled ? 'Fulfilled' : 'Processing'}
				</Badge>
			);
		},
	},
	{
		accessorKey: 'id',
		header: () => <div className="text-left">Order ID</div>,
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
		header: 'Created At',
		cell: ({ row }) => {
			const createdAt = row.getValue('createdAt') as Date;
			return new Date(createdAt).toLocaleDateString();
		},
	},
	{
		accessorKey: 'totalInCents',
		header: () => <div className="text-left">Total</div>,
		cell: ({ row }) => {
			const total = Number(row.getValue('totalInCents'));
			const formatted = formatCurrency(total / 100);

			return <div className="text-right font-medium">{formatted}</div>;
		},
	},
];
