'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreVertical } from 'lucide-react';

import { categoryDelete } from '@/actions/category-actions';
import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CategoryToggleActive from './category-toggle-active';
import CategoryMove from './category-move';

type Props = {
	category: {
		id: string;
		name: string;
		isActive: boolean;
		// place in the storefront order (1 = first) and how many categories there are
		position: number;
		total: number;
	};
};

export default function CategoryActions({ category }: Props) {
	const router = useRouter();
	const [confirmOpen, setConfirmOpen] = useState(false);
	// the dialog opens once the menu has fully closed, so the two don't fight over focus
	const confirmAfterClose = useRef(false);

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
					<Link href={`/admin/category/${category.id}/edit`}>
						<DropdownMenuItem>Edit</DropdownMenuItem>
					</Link>
					<CategoryToggleActive category={category} />
					<CategoryMove category={category} />
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onSelect={() => {
								confirmAfterClose.current = true;
							}}
						className="text-destructive"
					>
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<ConfirmDeleteDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title={`Delete “${category.name}”?`}
				description="This permanently deletes the category. A category that still has products can't be deleted, so move or delete those first. This can't be undone."
				onConfirm={async () => {
					const result = await categoryDelete(category.id);
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
