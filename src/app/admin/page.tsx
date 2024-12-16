import { verifyAuthSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';

export default async function AdminDashboardPage() {
	const result = await verifyAuthSession();

	if (result.user == null) {
		return redirect('/sign-in');
	}
	console.log(result.user.role);
	console.log('user', result.user);

	// if (result.user.role === 'USER') {
	// 	return redirect('/');
	// }

	return (
		<>
			<h1 className="text-center text-4xl">Admin Dashboard</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
				<Card>
					<CardHeader>
						<CardTitle>Users</CardTitle>
					</CardHeader>
					<CardContent>
						<CardDescription>Manage users</CardDescription>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Products</CardTitle>
					</CardHeader>
					<CardContent>
						<CardDescription>Manage products</CardDescription>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Orders</CardTitle>
					</CardHeader>
					<CardContent>
						<CardDescription>Manage orders</CardDescription>
					</CardContent>
				</Card>
			</div>
		</>
	);
}
