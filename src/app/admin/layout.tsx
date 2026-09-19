import AdminHeader from '@/components/admin-header';
import { requireAdminSession } from '@/lib/auth';

type Props = {
	children: React.ReactNode;
};

export default async function AdminLayout({ children }: Props) {
	await requireAdminSession();

	return (
		<>
			<AdminHeader />
			<div className="container mx-auto my-8 px-4">{children}</div>
		</>
	);
}
