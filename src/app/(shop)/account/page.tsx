import { redirect } from 'next/navigation';
import { verifyAuthSession } from '@/lib/auth';
import {
	getProfileIdByUserId,
	getAddressByProfileId,
	getUserById,
} from '@/db/user-db';
import { resendVerificationEmailAction } from '@/actions/user-actions';
import EditProfileForm from '@/components/forms/edit-profile-form';
import { signInUrl } from '@/lib/redirects';

export default async function AccountPage() {
	const { user: sessionUser } = await verifyAuthSession();

	if (sessionUser == null) {
		redirect(signInUrl('/account'));
	}

	const user = await getUserById(sessionUser.id);
	const profileId = await getProfileIdByUserId(sessionUser.id);
	const address = profileId ? await getAddressByProfileId(profileId) : null;

	return (
		<main className="mx-auto max-w-lg px-5 py-10 sm:px-10">
			<h1 className="mb-6 text-center font-display text-3xl font-semibold">
				Account
			</h1>
			{user && !user.emailVerified && (
				<div className="mb-6 flex flex-col items-center gap-2 rounded-2xl border border-border bg-muted px-5 py-4 text-center">
					<p className="text-sm font-semibold">
						Please verify your email address ({user.email}).
					</p>
					<form action={resendVerificationEmailAction}>
						<button className="text-sm font-bold text-primary underline">
							Resend verification email
						</button>
					</form>
				</div>
			)}
			<EditProfileForm
				defaultValues={{
					name: address?.name ?? '',
					address1: address?.address1 ?? '',
					address2: address?.address2 ?? '',
					city: address?.city ?? '',
					state: address?.state ?? '',
					zip: address?.zip ?? '',
				}}
			/>
		</main>
	);
}
