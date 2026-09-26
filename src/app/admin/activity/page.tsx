import { DataTable } from '@/components/data-table';
import FilterTabs from '@/components/filter-tabs';
import { Card } from '@/components/ui/card';
import {
	ACTIVITY_AREAS,
	ACTIVITY_AREA_LABELS,
	ACTIVITY_PAGE_LIMIT,
	getActivity,
	getActivityCounts,
	parseActivityArea,
} from '@/db/activity-db';
import { columns } from './_components/columns';

export default async function ActivityPage({
	searchParams,
}: {
	searchParams: { area?: string };
}) {
	const area = parseActivityArea(searchParams.area);
	const [entries, counts] = await Promise.all([
		getActivity(area),
		getActivityCounts(),
	]);

	return (
		<main className="mx-auto max-w-5xl">
			<header className="mb-2">
				<h1 className="font-display text-3xl font-semibold">Activity</h1>
			</header>
			<p className="mb-6 text-sm text-muted-foreground">
				What admins have changed, newest first. Changes made before this page
				existed, or directly in the database, aren&apos;t listed. Who was made
				or removed as an admin is also on the Role history page.
			</p>
			{counts.all === 0 ? (
				<Card className="p-6 text-center text-muted-foreground shadow-warm-sm">
					Nothing has been recorded yet.
				</Card>
			) : (
				<>
					<div className="mb-4">
						<FilterTabs
							label="Filter activity"
							options={[
								{
									label: 'All',
									href: '/admin/activity',
									count: counts.all,
									active: !area,
								},
								...ACTIVITY_AREAS.map((option) => ({
									label: ACTIVITY_AREA_LABELS[option],
									href: `/admin/activity?area=${option}`,
									count: counts[option],
									active: area === option,
								})),
							]}
						/>
					</div>
					<Card className="p-2 shadow-warm-sm">
						<DataTable
							// a new filter starts the table fresh (search, sort and page)
							key={area ?? 'all'}
							columns={columns}
							data={entries}
							searchColumns={['summary', 'who']}
							searchPlaceholder="Search by what or who"
							initialSorting={[{ id: 'createdAt', desc: true }]}
						/>
					</Card>
					{entries.length >= ACTIVITY_PAGE_LIMIT && (
						<p className="mt-2 text-center text-xs text-muted-foreground">
							Showing the latest {ACTIVITY_PAGE_LIMIT} entries.
						</p>
					)}
				</>
			)}
		</main>
	);
}
