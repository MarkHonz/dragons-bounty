import { verifyAuthSession } from '@/lib/auth';
import { getOrdersForExport, parseOrderStatusFilter } from '@/db/orders-db';
import { logActivity } from '@/db/activity-db';
import { ordersToCsv } from '@/lib/csv';
import { describeRange, parseOrderDateRange } from '@/lib/date-range';

export const dynamic = 'force-dynamic';

const FILTER_LABELS = {
	shipping: 'Needs shipping',
	fulfilled: 'Fulfilled',
	refunded: 'Refunded',
} as const;

// Downloads the orders shown by an Orders filter tab as a CSV file. Unlike the
// admin pages, a route handler isn't covered by the admin layout, so it checks
// for an admin itself and gives everyone else nothing.
export async function GET(request: Request) {
	const { user } = await verifyAuthSession();
	if (!user || user.role !== 'ADMIN') {
		return new Response('Forbidden', { status: 403 });
	}

	const params = new URL(request.url).searchParams;
	const status = parseOrderStatusFilter(params.get('status') ?? undefined);
	// optional days to include, worked out in the admin's own time zone
	const parsed = parseOrderDateRange(
		params.get('from'),
		params.get('to'),
		params.get('tz')
	);
	if (!parsed.ok) {
		return new Response(parsed.message, { status: 400 });
	}
	const { range } = parsed;
	const rangeLabel = describeRange(range);

	const orders = await getOrdersForExport(status, range);
	const csv = ordersToCsv(orders);

	await logActivity(
		user.id as string,
		'ORDER',
		`Exported ${orders.length} ${orders.length === 1 ? 'order' : 'orders'} to CSV (${
			status ? FILTER_LABELS[status] : 'All'
		}${rangeLabel ? `, ${rangeLabel}` : ''})`
	);

	const date = new Date().toISOString().slice(0, 10);
	// dates are digits and dashes only (checked above), so they are safe in a filename
	const datePart = rangeLabel
		? `${range.fromDate ?? 'start'}_to_${range.toDate ?? 'today'}`
		: date;
	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="orders-${datePart}${
				status ? `-${status}` : ''
			}.csv"`,
			'Cache-Control': 'no-store',
		},
	});
}
