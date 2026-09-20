'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreVertical } from 'lucide-react';

import {
	deleteDiscountCodeAction,
	toggleDiscountCodeActive,
} from '@/actions/discount-actions';
import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Props = {
	code: { id: string; code: string; isActive: boolean };
};

export default function DiscountActions({ code }: Props) {
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
					<Link href={`/admin/discounts/${code.id}/edit`}>
						<DropdownMenuItem>Edit</DropdownMenuItem>
					</Link>
					<DropdownMenuItem
						onClick={async () => {
							await toggleDiscountCodeActive(code.id, !code.isActive);
							router.refresh();
						}}
					>
						{code.isActive ? 'Deactivate' : 'Activate'}
					</DropdownMenuItem>
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
				title={`Delete “${code.code}”?`}
				description="Customers can no longer use this code, and it disappears from any cart it's in. Orders that already used it keep showing it. This can't be undone."
				onConfirm={async () => {
					const result = await deleteDiscountCodeAction(code.id);
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
