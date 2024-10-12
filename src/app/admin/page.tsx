import { verifyAuthSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminDashboardPage() {
	const result = await verifyAuthSession();

	if (result.user == null) {
		return redirect('/sign-in');
	}

	// if (result.user.role === 'USER') {
	// 	return redirect('/');
	// }

	return (
		<>
			<h1>Admin Dashboard</h1>
			<h3>{result.user.email}</h3>
			<p>{result.user.role}</p>
		</>
	);
}
