import SignInForm from '@/components/forms/sign-in-form';
import { safeRedirectPath } from '@/lib/redirects';

type Props = {
	searchParams: { next?: string; notice?: string };
};

export default function SignInPage({ searchParams }: Props) {
	return (
		<main className="mx-auto flex max-w-lg flex-col justify-center px-5 py-16 sm:px-10">
			<SignInForm
				next={safeRedirectPath(searchParams.next)}
				passwordWasReset={searchParams.notice === 'password-reset'}
			/>
		</main>
	);
}
