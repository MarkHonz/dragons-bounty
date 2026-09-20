import db from '@/db/db';

export const ACTIVITY_AREAS = [
	'ORDER',
	'PRODUCT',
	'CATEGORY',
	'PRICING',
	'CUSTOMER',
] as const;
export type ActivityArea = (typeof ACTIVITY_AREAS)[number];

export const ACTIVITY_AREA_LABELS: Record<ActivityArea, string> = {
	ORDER: 'Orders',
	PRODUCT: 'Products',
	CATEGORY: 'Categories',
	PRICING: 'Discounts & shipping',
	CUSTOMER: 'Customers',
};

export const parseActivityArea = (
	value: string | undefined
): ActivityArea | undefined => ACTIVITY_AREAS.find((area) => area === value);

const MAX_SUMMARY_LENGTH = 300;

// Write one line in the activity log. This runs after the change it describes
// has already been saved, so a failure here is reported on the server and never
// undoes, blocks or fails the change.
export const logActivity = async (
	actorId: string,
	area: ActivityArea,
	summary: string,
	orderId?: string
) => {
	try {
		const actor = await db.user.findUnique({
			where: { id: actorId },
			select: { email: true, profile: { select: { name: true } } },
		});
		await db.activityLog.create({
			data: {
				actorId: actor ? actorId : null,
				actorEmail: actor?.email ?? 'unknown',
				actorName: actor?.profile?.name ?? null,
				area,
				// product and category names are typed by admins, so keep it bounded
				summary:
					summary.length > MAX_SUMMARY_LENGTH
						? `${summary.slice(0, MAX_SUMMARY_LENGTH - 1)}…`
						: summary,
				orderId: orderId ?? null,
			},
		});
	} catch (error) {
		console.error('Failed to write the activity log', error);
	}
};

export type ActivityRow = {
	id: string;
	createdAt: Date;
	actorEmail: string;
	actorName: string | null;
	area: string;
	summary: string;
	orderId: string | null;
};

const activitySelect = {
	id: true,
	createdAt: true,
	actorEmail: true,
	actorName: true,
	area: true,
	summary: true,
	orderId: true,
} as const;

export const ACTIVITY_PAGE_LIMIT = 1000;

// newest first, optionally only one area; capped so the page stays quick
export const getActivity = async (
	area?: ActivityArea
): Promise<ActivityRow[]> =>
	db.activityLog.findMany({
		where: area ? { area } : undefined,
		orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
		take: ACTIVITY_PAGE_LIMIT,
		select: activitySelect,
	});

export const getActivityCounts = async (): Promise<
	Record<ActivityArea | 'all', number>
> => {
	const groups = await db.activityLog.groupBy({
		by: ['area'],
		_count: { _all: true },
	});
	const counts = {
		all: 0,
		ORDER: 0,
		PRODUCT: 0,
		CATEGORY: 0,
		PRICING: 0,
		CUSTOMER: 0,
	};
	for (const group of groups) {
		counts.all += group._count._all;
		const area = parseActivityArea(group.area);
		if (area) counts[area] += group._count._all;
	}
	return counts;
};

export const getOrderActivity = async (
	orderId: string
): Promise<ActivityRow[]> =>
	db.activityLog.findMany({
		where: { orderId },
		orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
		select: activitySelect,
	});
