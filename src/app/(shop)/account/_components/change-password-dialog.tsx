'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import ChangePasswordForm from '@/components/forms/change-password-form';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { useHydrated } from '@/lib/use-hydrated';

export default function ChangePasswordDialog() {
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
				Change password
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Change password</DialogTitle>
						<DialogDescription>
							Any other devices you&apos;re signed in on will be signed out.
						</DialogDescription>
					</DialogHeader>
					<ChangePasswordForm
						onDone={() => {
							toast.success('Your password was changed');
							setOpen(false);
							router.refresh();
						}}
					/>
				</DialogContent>
			</Dialog>
		</>
	);
}
