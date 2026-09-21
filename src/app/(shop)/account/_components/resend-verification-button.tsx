'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { resendVerificationAction } from '@/actions/account-actions';
import { useHydrated } from '@/lib/use-hydrated';

export default function ResendVerificationButton() {
	const hydrated = useHydrated();
	const [sending, setSending] = useState(false);

	return (
		<button
			type="button"
			className="text-sm font-bold text-primary underline disabled:opacity-60"
			disabled={!hydrated || sending}
			onClick={async () => {
				setSending(true);
				const result = await resendVerificationAction();
				setSending(false);
				if (result.success) toast.success('Verification email sent');
				else toast.error(result.errors.join(' '));
			}}
		>
			{sending ? 'Sending...' : 'Resend verification email'}
		</button>
	);
}
