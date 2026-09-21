'use client';

import { useState } from 'react';
import Link from 'next/link';

import { confirmEmailChangeAction } from '@/actions/account-actions';
import { Button } from '@/components/ui/button';
import { useHydrated } from '@/lib/use-hydrated';

// Shows the change and finishes it when Confirm is pressed. `token` is the one
// from the emailed link; it is only used up when the server accepts it.
export default function ConfirmEmailChangeForm({
	token,
	oldEmail,
	newEmail,
}: {
	token: string;
	oldEmail: string;
	newEmail: string;
}) {
	const hydrated = useHydrated();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [done, setDone] = useState(false);

	if (done) {
		return (
			<div className="flex flex-col gap-3 text-center">
				<h1 className="font-display text-2xl font-semibold">Email Changed</h1>
				<p role="status">
					Your email address is now{' '}
					<strong className="break-all">{newEmail}</strong>. From now on, sign
					in with it. Any other devices were signed out.
				</p>
				<Link href="/account" className="text-primary underline">
					Go to Account
				</Link>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 text-center">
			<h1 className="font-display text-2xl font-semibold">
				Change Your Email?
			</h1>
			<p>
				Change the email address on your account from{' '}
				<strong className="break-all">{oldEmail}</strong> to{' '}
				<strong className="break-all">{newEmail}</strong>?
			</p>
			{error && (
				<p className="text-sm font-medium text-destructive" role="alert">
					{error}
				</p>
			)}
			<Button
				className="rounded-full"
				disabled={!hydrated || busy}
				onClick={async () => {
					setBusy(true);
					setError('');
					const result = await confirmEmailChangeAction(token);
					setBusy(false);
					if (result.success) setDone(true);
					else setError(result.errors.join(' '));
				}}
			>
				{busy ? 'Changing...' : 'Confirm Change'}
			</Button>
			<Link href="/account" className="text-sm text-muted-foreground underline">
				Not now
			</Link>
		</div>
	);
}
