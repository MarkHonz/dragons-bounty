'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { cancelEmailChangeAction } from '@/actions/account-actions';
import { Button } from '@/components/ui/button';
import { useHydrated } from '@/lib/use-hydrated';

// Shown while a change of email address is waiting for its confirmation link.
export default function PendingEmailBanner({
	maskedNewEmail,
}: {
	maskedNewEmail: string;
}) {
	const router = useRouter();
	const hydrated = useHydrated();
	const [busy, setBusy] = useState(false);

	return (
		<div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-muted px-5 py-4 text-center sm:flex-row sm:justify-between sm:text-left">
			<p className="text-sm">
				<span className="font-semibold">Email change waiting.</span> We sent a
				confirmation link to{' '}
				<span className="break-all font-semibold">{maskedNewEmail}</span>. Your
				email stays the same until it&apos;s confirmed.
			</p>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="rounded-full"
				disabled={!hydrated || busy}
				onClick={async () => {
					setBusy(true);
					const result = await cancelEmailChangeAction();
					setBusy(false);
					if (result.success) {
						toast.success('Email change cancelled');
						router.refresh();
					} else {
						toast.error(result.errors.join(' '));
					}
				}}
			>
				Cancel change
			</Button>
		</div>
	);
}
