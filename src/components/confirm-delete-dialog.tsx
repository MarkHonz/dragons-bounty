'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	// button text; defaults suit a delete
	confirmLabel?: string;
	pendingLabel?: string;
	// resolves to an error message to show, or null once it succeeded
	onConfirm: () => Promise<string | null>;
};

export default function ConfirmDeleteDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel = 'Delete',
	pendingLabel = 'Deleting…',
	onConfirm,
}: Props) {
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');

	const handleOpenChange = (next: boolean) => {
		// don't let the dialog be dismissed while the action is running
		if (pending) return;
		setError('');
		onOpenChange(next);
	};

	const confirm = async () => {
		setPending(true);
		setError('');
		try {
			const message = await onConfirm();
			if (message) {
				setError(message);
			} else {
				onOpenChange(false);
			}
		} catch (caught) {
			console.error('Confirmed action failed', caught);
			setError('Something went wrong. Please try again.');
		} finally {
			setPending(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				{error && (
					<p className="text-sm font-medium text-destructive">{error}</p>
				)}
				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						variant="outline"
						onClick={() => handleOpenChange(false)}
						disabled={pending}
					>
						Cancel
					</Button>
					<Button variant="destructive" onClick={confirm} disabled={pending}>
						{pending ? pendingLabel : confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
