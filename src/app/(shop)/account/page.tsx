import { redirect } from 'next/navigation';
import { verifyAuthSession } from '@/lib/auth';
import { getProfileIdByUserId, getAddressByProfileId } from '@/db/user-db';
import EditProfileForm from '@/components/forms/edit-profile-form';

export default async function AccountPage() {
	const { user } = await verifyAuthSession();

	if (user == null) {
		redirect('/sign-in');
	}

	const profileId = await getProfileIdByUserId(user.id);
	const address = profileId ? await getAddressByProfileId(profileId) : null;

	return (
		<main className="mx-auto max-w-lg px-5 py-10 sm:px-10">
			<h1 className="mb-6 text-center font-display text-3xl font-semibold">
				Account
			</h1>
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
