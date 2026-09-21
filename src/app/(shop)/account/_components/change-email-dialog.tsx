'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import ChangeEmailForm from '@/components/forms/change-email-form';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { useHydrated } from '@/lib/use-hydrated';

export default function ChangeEmailDialog({
	currentEmail,
}: {
	currentEmail: string;
}) {
	const router = useRouter();
	const hydrated = useHydrated();
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				type="button"
				variant="outline"
				className="rounded-full"
				disabled={!hydrated}
				onClick={() => setOpen(true)}
			>
				Change email
			</Button>
			<Dialog
				open={open}
				onOpenChange={(next) => {
					setOpen(next);
					// a change may now be waiting for confirmation: show it
					if (!next) router.refresh();
				}}
			>
				<DialogContent className="max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Change email</DialogTitle>
						<DialogDescription>
							Your email is how you sign in and get password resets.
						</DialogDescription>
					</DialogHeader>
					<ChangeEmailForm
						currentEmail={currentEmail}
						onDone={() => {
							setOpen(false);
							router.refresh();
						}}
					/>
				</DialogContent>
			</Dialog>
		</>
	);
}
