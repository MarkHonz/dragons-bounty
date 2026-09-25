import { notFound, redirect } from 'next/navigation';

import { verifyAuthSession } from '@/lib/auth';
import { signInUrl } from '@/lib/redirects';

// /artist on its own: an artist goes to their own page.
export default async function ArtistHomePage() {
	const { user } = await verifyAuthSession();
	if (!user) redirect(signInUrl('/artist'));
	if (!user.isArtist) notFound();
	redirect(`/artist/${user.id}`);
}
