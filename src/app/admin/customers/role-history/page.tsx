import Link from 'next/link';

import { DataTable } from '@/components/data-table';
import { Card } from '@/components/ui/card';
import { getRoleChanges } from '@/db/user-db';
import { columns } from './_components/columns';

export default async function RoleHistoryPage() {
	const changes = await getRoleChanges();

	return (
		<main className="mx-auto max-w-5xl">
			<header className="mb-2 flex items-center justify-between gap-4">
				<h1 className="font-display text-3xl font-semibold">Role history</h1>
				<Link href="/admin/customers" className="text-sm text-primary">
					Back to customers
				</Link>
			</header>
			<p className="mb-6 text-sm text-muted-foreground">
				Every time an admin was made or removed from this section. Changes made
				before this page existed, or directly in the database, aren&apos;t
				listed.
			</p>

			{changes.length > 0 ? (
				<Card className="p-2 shadow-warm-sm">
					<DataTable
						columns={columns}
						data={changes}
						searchColumns={['person', 'actor']}
						searchPlaceholder="Search by name or email"
						// newest first
						initialSorting={[{ id: 'createdAt', desc: true }]}
					/>
				</Card>
			) : (
				<Card className="p-6 text-center text-muted-foreground shadow-warm-sm">
					No role changes have been recorded yet.
				</Card>
			)}
		</main>
	);
}
