import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { DataTable } from '@/components/data-table';
import FilterTabs from '@/components/filter-tabs';
import { columns } from './_components/columns';
import { getCustomers } from '@/db/user-db';

type Props = {
	searchParams: { role?: string };
};

export default async function AdminCustomersPage({ searchParams }: Props) {
	const all = await getCustomers();
	const adminsOnly = searchParams.role === 'admin';
	const artistsOnly = searchParams.role === 'artist';
	const admins = all.filter((customer) => customer.role === 'ADMIN');
	const artists = all.filter((customer) => customer.isArtist);
	const customers = adminsOnly ? admins : artistsOnly ? artists : all;

	return (
		<main className="mx-auto max-w-5xl">
			<header className="mb-6 flex items-center justify-between gap-4">
				<h1 className="font-display text-3xl font-semibold">Customers</h1>
				<Button asChild variant="outline" className="rounded-full">
					<Link href="/admin/customers/role-history">Role history</Link>
				</Button>
			</header>

			{all.length > 0 ? (
				<>
					<div className="mb-4">
						<FilterTabs
							label="Filter customers"
							options={[
								{
									label: 'All',
									href: '/admin/customers',
									count: all.length,
									active: !adminsOnly && !artistsOnly,
								},
								{
									label: 'Admins',
									href: '/admin/customers?role=admin',
									count: admins.length,
									active: adminsOnly,
								},
								{
									label: 'Artists',
									href: '/admin/customers?role=artist',
									count: artists.length,
									active: artistsOnly,
								},
							]}
						/>
					</div>
					<Card className="p-2 shadow-warm-sm">
						<DataTable
							// a new filter starts the table fresh (search, sort and page)
							key={adminsOnly ? 'admins' : artistsOnly ? 'artists' : 'all'}
							columns={columns}
							data={customers}
							searchColumns={['name', 'email']}
							searchPlaceholder="Search by name or email"
						/>
					</Card>
				</>
			) : (
				<Card className="p-6 text-center text-muted-foreground shadow-warm-sm">
					No customers found.
				</Card>
			)}
		</main>
	);
}
