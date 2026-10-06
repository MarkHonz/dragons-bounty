import { DataTable } from '@/components/data-table';
import FilterTabs from '@/components/filter-tabs';
import { Card } from '@/components/ui/card';
import { getCustomRequestCounts, getCustomRequests } from '@/db/custom-request-db';
import { parseRequestStatus } from '@/lib/custom-request-rules';
import { columns } from './_components/columns';

type Props = {
	searchParams: { status?: string };
};

// Custom art requests sent from the /custom-orders form.
export default async function AdminRequestsPage({ searchParams }: Props) {
	const status = parseRequestStatus(searchParams.status);
	const [requests, counts] = await Promise.all([
		getCustomRequests(status),
		getCustomRequestCounts(),
	]);

	return (
		<main className="mx-auto max-w-5xl">
			<header className="mb-2">
				<h1 className="font-display text-3xl font-semibold">Custom art requests</h1>
			</header>
			<p className="mb-6 text-sm text-muted-foreground">
				Sent from the Custom Art page. Each admin is emailed too; mark a request
				Replied once you&apos;ve been in touch, and Closed when it&apos;s done.
			</p>

			{counts.all === 0 ? (
				<Card className="p-6 text-center text-muted-foreground shadow-warm-sm">
					No requests yet.
				</Card>
			) : (
				<>
					<div className="mb-4">
						<FilterTabs
							label="Filter requests"
							options={[
								{ label: 'All', href: '/admin/requests', count: counts.all, active: !status },
								{
									label: 'New',
									href: '/admin/requests?status=NEW',
									count: counts.NEW,
									active: status === 'NEW',
								},
								{
									label: 'Replied',
									href: '/admin/requests?status=REPLIED',
									count: counts.REPLIED,
									active: status === 'REPLIED',
								},
								{
									label: 'Closed',
									href: '/admin/requests?status=CLOSED',
									count: counts.CLOSED,
									active: status === 'CLOSED',
								},
							]}
						/>
					</div>
					<Card className="p-2 shadow-warm-sm">
						<DataTable
							// a new filter starts the table fresh (search, sort and page)
							key={status ?? 'all'}
							columns={columns}
							data={requests}
							searchColumns={['name', 'contact', 'description']}
							searchPlaceholder="Search by name, email, phone or text"
							// newest first
							initialSorting={[{ id: 'createdAt', desc: true }]}
						/>
					</Card>
				</>
			)}
		</main>
	);
}
