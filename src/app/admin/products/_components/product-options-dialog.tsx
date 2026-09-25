'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { ProductProps } from '@/db/product-db';
import { formatCurrency } from '@/lib/formatters';
import { getStockStatus } from '@/lib/stock';
import { variantPrice } from '@/lib/variants';

// The "N options" text in the Quantity column: a button that opens a read-only
// look at each option's name, price, and stock, without leaving the list.
export default function ProductOptionsDialog({
	product,
}: {
	product: ProductProps;
}) {
	const [open, setOpen] = useState(false);
	const count = product.variants.length;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<Button
				type="button"
				variant="link"
				className="h-auto whitespace-nowrap p-0 text-xs text-muted-foreground underline"
				onClick={(event) => {
					// this sits inside a sortable column header's cell; don't let the
					// click bubble up into a row click or sort toggle
					event.stopPropagation();
					setOpen(true);
				}}
			>
				{count} {count === 1 ? 'option' : 'options'}
			</Button>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle className="font-display">{product.name}</DialogTitle>
				</DialogHeader>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Option</TableHead>
							<TableHead>Price</TableHead>
							<TableHead className="text-center">Quantity</TableHead>
							<TableHead />
						</TableRow>
					</TableHeader>
					<TableBody>
						{product.variants.map((variant) => {
							const status = getStockStatus(variant.quantity);
							const price = variantPrice(product.priceInCents, variant);
							return (
								<TableRow key={variant.id}>
									<TableCell>{variant.name}</TableCell>
									<TableCell>
										{formatCurrency(price / 100)}
										{variant.priceInCents == null && (
											<span className="block text-xs text-muted-foreground">
												product price
											</span>
										)}
									</TableCell>
									<TableCell className="text-center">
										{variant.quantity}
									</TableCell>
									<TableCell>
										{status === 'sold-out' && (
											<Badge variant="destructive" className="whitespace-nowrap">
												Sold out
											</Badge>
										)}
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
				<DialogFooter className="flex-row items-center justify-between sm:justify-between">
					<Link
						href={`/admin/products/${product.id}/edit`}
						className="text-sm font-semibold text-primary underline"
					>
						Edit options
					</Link>
					<Button
						type="button"
						variant="outline"
						className="rounded-full"
						onClick={() => setOpen(false)}
					>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
