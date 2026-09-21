'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import EditProfileForm from '@/components/forms/edit-profile-form';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import type { ProfileInput } from '@/lib/profile-rules';
import { useHydrated } from '@/lib/use-hydrated';

// A button that opens the Edit dialog for the name and shipping address. The form
// only exists while the dialog is open, so it always starts from what is saved.
export default function EditProfileDialog({
	defaultValues,
	label,
	variant = 'outline',
}: {
	defaultValues: ProfileInput;
	label: string;
	variant?: 'outline' | 'default';
}) {
	const router = useRouter();
	const hydrated = useHydrated();
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				type="button"
				variant={variant}
				className="rounded-full"
				disabled={!hydrated}
				onClick={() => setOpen(true)}
			>
				{label}
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit profile</DialogTitle>
						<DialogDescription>
							Your name and shipping address. Checkout starts with this address
							filled in.
						</DialogDescription>
					</DialogHeader>
					<EditProfileForm
						defaultValues={defaultValues}
						onSaved={() => {
							toast.success('Profile updated');
							setOpen(false);
							router.refresh();
						}}
					/>
				</DialogContent>
			</Dialog>
		</>
	);
}
