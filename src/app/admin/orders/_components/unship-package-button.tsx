'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { unshipPackageAction } from '@/actions/artist-actions';
import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';
import { Button } from '@/components/ui/button';
import { useHydrated } from '@/lib/use-hydrated';

// Admin only: take back a "shipped" that was marked by mistake.
export default function UnshipPackageButton({
	orderId,
	sellerId,
	sellerLabel,
}: {
	orderId: string;
	sellerId: string;
	sellerLabel: string;
}) {
	const router = useRouter();
	const hydrated = useHydrated();
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="self-start px-2 text-muted-foreground"
				disabled={!hydrated}
				onClick={() => setOpen(true)}
			>
				Mark as not shipped
			</Button>
			<ConfirmDeleteDialog
				open={open}
				onOpenChange={setOpen}
				title="Mark as not shipped?"
				description={`${sellerLabel}'s package goes back to "needs shipping" and its tracking number is removed. The customer isn't emailed.`}
				confirmLabel="Mark as not shipped"
				pendingLabel="Saving…"
				onConfirm={async () => {
					const result = await unshipPackageAction(orderId, sellerId);
					if (!result.ok) return result.message;
					toast.success(result.message);
					router.refresh();
					return null;
				}}
			/>
		</>
	);
}
