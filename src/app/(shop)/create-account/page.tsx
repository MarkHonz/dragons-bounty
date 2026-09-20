import CreateUserForm from '@/components/forms/create-user-form';
import { safeRedirectPath } from '@/lib/redirects';

type Props = {
	searchParams: { next?: string };
};

export default function CreateAccountPage({ searchParams }: Props) {
	return (
		<main className="mx-auto flex max-w-lg flex-col justify-center px-5 py-16 sm:px-10">
			<CreateUserForm next={safeRedirectPath(searchParams.next)} />
		</main>
	);
}
