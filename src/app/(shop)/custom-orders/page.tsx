import type { Metadata } from 'next';

import CustomRequestForm from '@/components/forms/custom-request-form';
import { getUserById } from '@/db/user-db';
import { verifyAuthSession } from '@/lib/auth';

export const metadata: Metadata = {
	title: "Custom Art | Dragon's Bounty",
	description: 'Ask about a one-of-a-kind piece made just for you.',
};

export default async function CustomOrdersPage() {
	// signed-in customers start with their name and email filled in
	const { user } = await verifyAuthSession();
	const account = user ? await getUserById(user.id) : null;

	return (
		<main className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-10 sm:px-10">
			<header className="flex flex-col gap-2">
				<h1 className="font-display text-3xl font-semibold">Custom Art</h1>
				<p className="text-muted-foreground">
					Have something special in mind? Most of our pieces are hand-made and one
					of a kind, and we&apos;re happy to make one just for you. Tell us about it
					and we&apos;ll get back to you.
				</p>
			</header>
			<CustomRequestForm
				defaultName={account?.profile?.name ?? ''}
				defaultEmail={account?.email ?? ''}
			/>
		</main>
	);
}
