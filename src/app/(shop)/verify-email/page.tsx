import Link from 'next/link';
import { Card } from '@/components/ui/card';
import {
	deleteVerificationToken,
	findVerificationToken,
	markUserEmailVerified,
} from '@/db/user-db';

type VerifyEmailPageProps = {
	searchParams: {
		token?: string;
	};
};

export default async function VerifyEmailPage({
	searchParams,
}: VerifyEmailPageProps) {
	const token = searchParams.token
		? await findVerificationToken(searchParams.token)
		: null;

	const isValid = token !== null && token.expiresAt > new Date();

	if (isValid) {
		await markUserEmailVerified(token.userId);
		await deleteVerificationToken(token.id);
	}

	return (
		<main className="mx-auto max-w-lg px-5 py-20 sm:px-10">
			<Card className="flex flex-col gap-3 p-8 text-center shadow-warm-sm">
				<h1 className="font-display text-2xl font-semibold">
					{isValid ? 'Email Verified' : 'Invalid or Expired Link'}
				</h1>
				<p className="text-muted-foreground">
					{isValid
						? 'Thanks for confirming your email address.'
						: 'This verification link is invalid or has expired. You can request a new one from your account page.'}
				</p>
				<Link href="/account" className="text-primary underline">
					Go to Account
				</Link>
			</Card>
		</main>
	);
}
