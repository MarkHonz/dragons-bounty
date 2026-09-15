import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';

export default async function AdminDashboardPage() {
	return (
		<>
			<h1 className="text-center font-display text-3xl font-semibold">
				Admin Dashboard
			</h1>
			<div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				<Card className="shadow-warm-sm">
					<CardHeader>
						<CardTitle className="font-display text-xl">Users</CardTitle>
					</CardHeader>
					<CardContent>
						<CardDescription>Manage users</CardDescription>
					</CardContent>
				</Card>
				<Card className="shadow-warm-sm">
					<CardHeader>
						<CardTitle className="font-display text-xl">Products</CardTitle>
					</CardHeader>
					<CardContent>
						<CardDescription>Manage products</CardDescription>
					</CardContent>
				</Card>
				<Card className="shadow-warm-sm">
					<CardHeader>
						<CardTitle className="font-display text-xl">Orders</CardTitle>
					</CardHeader>
					<CardContent>
						<CardDescription>Manage orders</CardDescription>
					</CardContent>
				</Card>
			</div>
		</>
	);
}
