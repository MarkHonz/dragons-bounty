import Link from 'next/link';

import { DataTable } from '@/components/data-table';
import FilterTabs from '@/components/filter-tabs';
import { Card } from '@/components/ui/card';
import { getArtistChanges } from '@/db/artist-db';
import { getRoleChanges } from '@/db/user-db';
import { columns, type HistoryRow } from './_components/columns';

type Props = {
	searchParams: { type?: string };
};

export default async function RoleHistoryPage({ searchParams }: Props) {
	const [roleChanges, artistChanges] = await Promise.all([
		getRoleChanges(),
		getArtistChanges(),
	]);

	const roleRows: HistoryRow[] = roleChanges.map((change) => ({
		id: change.id,
		createdAt: change.createdAt,
		kind: 'ROLE',
		targetId: change.targetId,
		targetEmail: change.targetEmail,
		targetName: change.targetName,
		fromLabel: change.fromRole === 'ADMIN' ? 'Admin' : 'Customer',
		toLabel: change.toRole === 'ADMIN' ? 'Admin' : 'Customer',
		toVariant: change.toRole === 'ADMIN' ? 'default' : 'secondary',
		actorEmail: change.actorEmail,
		actorName: change.actorName,
	}));

	const artistRows: HistoryRow[] = artistChanges.map((change) => ({
		id: change.id,
		createdAt: change.createdAt,
		kind: 'ARTIST',
		targetId: change.targetId,
		targetEmail: change.targetEmail,
		targetName: change.targetName,
		fromLabel: change.fromName ? `"${change.fromName}"` : 'Not an artist',
		toLabel: change.toName ? `"${change.toName}"` : 'Not an artist',
		toVariant: change.toName ? 'secondary' : 'outline',
		actorEmail: change.actorEmail,
		actorName: change.actorName,
	}));

	const all = [...roleRows, ...artistRows].sort(
		(a, b) => b.createdAt.getTime() - a.createdAt.getTime()
	);
	const roleOnly = searchParams.type === 'role';
	const artistOnly = searchParams.type === 'artist';
	const changes = roleOnly ? roleRows : artistOnly ? artistRows : all;

	return (
		<main className="mx-auto max-w-5xl">
			<header className="mb-2 flex items-center justify-between gap-4">
				<h1 className="font-display text-3xl font-semibold">Role history</h1>
				<Link href="/admin/customers" className="text-sm text-primary">
					Back to customers
				</Link>
			</header>
			<p className="mb-6 text-sm text-muted-foreground">
				Every time an admin was made or removed, and every time an artist was
				added, renamed, or removed, from this section. Changes made before this
				page existed, or directly in the database, aren&apos;t listed.
			</p>

			{all.length > 0 ? (
				<>
					<div className="mb-4">
						<FilterTabs
							label="Filter role history"
							options={[
								{
									label: 'All',
									href: '/admin/customers/role-history',
									count: all.length,
									active: !roleOnly && !artistOnly,
								},
								{
									label: 'Admin',
									href: '/admin/customers/role-history?type=role',
									count: roleRows.length,
									active: roleOnly,
								},
								{
									label: 'Artist',
									href: '/admin/customers/role-history?type=artist',
									count: artistRows.length,
									active: artistOnly,
								},
							]}
						/>
					</div>
					<Card className="p-2 shadow-warm-sm">
						<DataTable
							// a new filter starts the table fresh (search, sort and page)
							key={roleOnly ? 'role' : artistOnly ? 'artist' : 'all'}
							columns={columns}
							data={changes}
							searchColumns={['person', 'actor']}
							searchPlaceholder="Search by name or email"
							// newest first
							initialSorting={[{ id: 'createdAt', desc: true }]}
						/>
					</Card>
				</>
			) : (
				<Card className="p-6 text-center text-muted-foreground shadow-warm-sm">
					No role changes have been recorded yet.
				</Card>
			)}
		</main>
	);
}
