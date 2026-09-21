'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { signOutOtherDevicesAction } from '@/actions/account-actions';
import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';
import { Button } from '@/components/ui/button';
import { useHydrated } from '@/lib/use-hydrated';

// Signs the account out of every other device or browser (never this one).
export default function SignOutOthersButton({
	otherDevices,
}: {
	otherDevices: number;
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
				disabled={!hydrated || otherDevices === 0}
				onClick={() => setOpen(true)}
			>
				Sign out of other devices
			</Button>
			<ConfirmDeleteDialog
				open={open}
				onOpenChange={setOpen}
				title="Sign out of other devices?"
				description="Every other browser or device signed in to your account will be signed out. You'll stay signed in here."
				confirmLabel="Sign out"
				pendingLabel="Signing out…"
				confirmVariant="default"
				onConfirm={async () => {
					const result = await signOutOtherDevicesAction();
					if (!result.success) return result.errors.join(' ');
					toast.success(
						result.count === 1
							? 'Signed out of 1 other device'
							: `Signed out of ${result.count} other devices`
					);
					router.refresh();
					return null;
				}}
			/>
		</>
	);
}
