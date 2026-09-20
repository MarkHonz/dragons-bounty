'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreVertical } from 'lucide-react';

import { productDelete } from '@/actions/product-actions';
import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ProductProps } from '@/db/product-db';
import ProductToggleAvailable from './product-toggle-available';
import ProductToggleFeatured from './product-toggle-featured';

export default function ProductActions({ product }: { product: ProductProps }) {
	const router = useRouter();
	const [confirmOpen, setConfirmOpen] = useState(false);
	// the dialog opens once the menu has fully closed, so the two don't fight over focus
	const confirmAfterClose = useRef(false);
	// a product that appears on past orders can't be deleted
	const canDelete = !product._count?.Orders_Products;
	const photoCount = product.images.length;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="h-8 w-8 p-0">
						<span className="sr-only">Open menu</span>
						<MoreVertical className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="end"
					onCloseAutoFocus={(event) => {
						if (confirmAfterClose.current) {
							event.preventDefault();
							confirmAfterClose.current = false;
							setConfirmOpen(true);
						}
					}}
				>
					<DropdownMenuLabel>Actions</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<Link href={`/admin/products/${product.id}/edit`}>
						<DropdownMenuItem>Edit</DropdownMenuItem>
					</Link>
					<ProductToggleAvailable
						product={{ id: product.id, isActive: product.isAvailable }}
					/>
					<ProductToggleFeatured
						product={{ id: product.id, isFeatured: product.isFeatured }}
					/>
					{canDelete && (
						<DropdownMenuItem
							onSelect={() => {
								confirmAfterClose.current = true;
							}}
							className="text-destructive"
						>
							Delete
						</DropdownMenuItem>
					)}
					<DropdownMenuSeparator />
				</DropdownMenuContent>
			</DropdownMenu>
			<ConfirmDeleteDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title={`Delete “${product.name}”?`}
				description={`This permanently removes the product${
					photoCount > 0
						? ` and its ${photoCount} photo${photoCount === 1 ? '' : 's'}`
						: ''
				}. This can't be undone. To just hide it from the shop, use Deactivate instead.`}
				onConfirm={async () => {
					const result = await productDelete(product.id);
					if (!result.success) {
						return result.errors.join(' ');
					}
					router.refresh();
					return null;
				}}
			/>
		</>
	);
}
