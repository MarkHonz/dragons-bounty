import type { Metadata } from 'next';
import Link from 'next/link';

import ResetPasswordForm from '@/components/forms/reset-password-form';
import { Card } from '@/components/ui/card';
import { isPasswordResetTokenUsable } from '@/db/password-reset-db';

// The link in the email holds a secret, so this page asks browsers not to pass
// it on to any other site, and keeps it out of search results.
export const metadata: Metadata = {
	referrer: 'no-referrer',
	robots: { index: false, follow: false },
};

type Props = {
	searchParams: { token?: string };
};

// Opening the link only checks it; nothing changes until a new password is sent.
export default async function ResetPasswordPage({ searchParams }: Props) {
	const token = searchParams.token;
	const usable = await isPasswordResetTokenUsable(token);

	return (
		<main className="mx-auto flex max-w-lg flex-col justify-center px-5 py-16 sm:px-10">
			{usable && typeof token === 'string' ? (
				<ResetPasswordForm token={token} />
			) : (
				<Card className="flex flex-col gap-3 p-8 text-center shadow-warm-sm">
					<h1 className="font-display text-2xl font-semibold">
						Invalid or Expired Link
					</h1>
					<p className="text-muted-foreground">
						This password reset link is invalid, has already been used, or has
						expired. Links work once and last 1 hour.
					</p>
					<Link href="/forgot-password" className="text-primary underline">
						Ask for a new link
					</Link>
				</Card>
			)}
		</main>
	);
}
