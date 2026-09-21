import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import ConfirmEmailChangeForm from '@/components/forms/confirm-email-change-form';
import { Card } from '@/components/ui/card';
import { findUsableEmailChange } from '@/db/email-change-db';
import { verifyAuthSession } from '@/lib/auth';

// The link in the email holds a secret, so this page asks browsers not to pass it
// on to any other site, and keeps it out of search results.
export const metadata: Metadata = {
	referrer: 'no-referrer',
	robots: { index: false, follow: false },
};

type Props = {
	searchParams: { token?: string | string[] };
};

const Notice = ({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) => (
	<main className="mx-auto flex max-w-lg flex-col justify-center px-5 py-16 sm:px-10">
		<Card className="flex flex-col gap-3 p-8 text-center shadow-warm-sm">
			<h1 className="font-display text-2xl font-semibold">{title}</h1>
			{children}
			<Link href="/account" className="text-primary underline">
				Go to Account
			</Link>
		</Card>
	</main>
);

// Opening the link only looks; nothing changes until Confirm is pressed. And it
// only works for the account that asked: anyone else is sent to sign in, or told
// it isn't theirs.
export default async function ConfirmEmailChangePage({ searchParams }: Props) {
	const token = searchParams.token;
	const change = await findUsableEmailChange(token);
	if (!change || typeof token !== 'string') {
		return (
			<Notice title="Invalid or Expired Link">
				<p className="text-muted-foreground">
					This link is invalid, has already been used, or has expired. Links
					work once and last 24 hours. You can ask for a new one from your
					account page.
				</p>
			</Notice>
		);
	}

	const { user } = await verifyAuthSession();
	if (!user) {
		redirect(
			`/sign-in?next=${encodeURIComponent(`/confirm-email-change?token=${token}`)}`
		);
	}
	if (user.id !== change.userId) {
		return (
			<Notice title="This Link Is for Another Account">
				<p className="text-muted-foreground">
					Sign out, then sign in with the account that asked to change its
					email, and open the link again.
				</p>
			</Notice>
		);
	}

	return (
		<main className="mx-auto flex max-w-lg flex-col justify-center px-5 py-16 sm:px-10">
			<Card className="p-8 shadow-warm-sm">
				<ConfirmEmailChangeForm
					token={token}
					oldEmail={change.oldEmail}
					newEmail={change.newEmail}
				/>
			</Card>
		</main>
	);
}
