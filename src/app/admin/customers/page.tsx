import { Card } from '@/components/ui/card';

import { DataTable } from '@/components/data-table';
import { columns } from './_components/columns';
import { getCustomers } from '@/db/user-db';

export default async function AdminCustomersPage() {
	const customers = await getCustomers();

	return (
		<main className="mx-auto max-w-5xl">
			<header className="mb-6 flex items-center justify-between gap-4">
				<h1 className="font-display text-3xl font-semibold">Customers</h1>
			</header>

			{customers.length > 0 ? (
				<Card className="p-2 shadow-warm-sm">
					<DataTable
						columns={columns}
						data={customers}
						searchColumns={['name', 'email']}
						searchPlaceholder="Search by name or email"
					/>
				</Card>
			) : (
				<Card className="p-6 text-center text-muted-foreground shadow-warm-sm">
					No customers found.
				</Card>
			)}
		</main>
	);
}
