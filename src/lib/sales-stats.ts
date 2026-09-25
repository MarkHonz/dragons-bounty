// Sales figures for the admin dashboard. Pure (no database), so it can be unit
// tested with orders at chosen times.
import {
	SHOP_TIME_ZONE,
	shopCalendarDay,
	shopDayKey,
	startOfShopDay,
	startOfShopMonth,
} from '@/lib/shop-time';

export type SaleOrder = {
	createdAt: Date;
	totalInCents: number;
	// null or 0 when nothing was refunded; equal to the total when all of it was
	refundedAmountInCents: number | null;
};

// What an order brought in: what the customer paid, less anything refunded.
// It counts on the shop day it was placed, even if refunded later.
export const netOf = (order: SaleOrder) =>
	Math.max(0, order.totalInCents - (order.refundedAmountInCents ?? 0));

export type PeriodTotals = {
	netInCents: number;
	orders: number;
	// orders that weren't refunded in full (the average is taken over these)
	paidOrders: number;
};

export const totalsBetween = (
	orders: SaleOrder[],
	start: Date,
	endExclusive: Date
): PeriodTotals => {
	const inRange = orders.filter(
		(order) => order.createdAt >= start && order.createdAt < endExclusive
	);
	return {
		netInCents: inRange.reduce((sum, order) => sum + netOf(order), 0),
		orders: inRange.length,
		paidOrders: inRange.filter((order) => netOf(order) > 0).length,
	};
};

// "+12%", "-5%" or "same" against an earlier figure; null when there was
// nothing before to compare with (a percentage of zero means nothing).
export const changeFrom = (current: number, previous: number) => {
	if (previous <= 0) return null;
	const percent = Math.round(((current - previous) / previous) * 100);
	return percent;
};

export type SalesPeriod = {
	current: PeriodTotals;
	previous: PeriodTotals;
	changePercent: number | null;
};

const period = (
	orders: SaleOrder[],
	start: Date,
	end: Date,
	prevStart: Date,
	prevEnd: Date
): SalesPeriod => {
	const current = totalsBetween(orders, start, end);
	const previous = totalsBetween(orders, prevStart, prevEnd);
	return {
		current,
		previous,
		changePercent: changeFrom(current.netInCents, previous.netInCents),
	};
};

export const CHART_DAYS = 30;

export type DailySales = { day: string; netInCents: number; orders: number };

// The dashboard's sales: today vs yesterday (so far today vs all of
// yesterday), the last 7 days (today included) vs the 7 before, and this month
// so far vs the same number of days at the start of last month; plus one bar
// per shop day for the last 30 days, empty days included.
export const summarizeDashboardSales = (
	orders: SaleOrder[],
	now: Date,
	timeZone = SHOP_TIME_ZONE
) => {
	const todayStart = startOfShopDay(now, 0, timeZone);
	const tomorrowStart = startOfShopDay(now, 1, timeZone);
	const monthStart = startOfShopMonth(now, 0, timeZone);
	const lastMonthStart = startOfShopMonth(now, -1, timeZone);
	// days of this month so far, today included (1 on the 1st)
	const dayOfMonth = shopCalendarDay(now, timeZone).day;
	const lastMonthSameSpanEnd = new Date(
		Math.min(
			startOfShopDay(lastMonthStart, dayOfMonth, timeZone).getTime(),
			monthStart.getTime()
		)
	);

	const today = period(
		orders,
		todayStart,
		tomorrowStart,
		startOfShopDay(now, -1, timeZone),
		todayStart
	);
	const week = period(
		orders,
		startOfShopDay(now, -6, timeZone),
		tomorrowStart,
		startOfShopDay(now, -13, timeZone),
		startOfShopDay(now, -6, timeZone)
	);
	const month = period(
		orders,
		monthStart,
		tomorrowStart,
		lastMonthStart,
		lastMonthSameSpanEnd
	);

	const byDay = new Map<string, DailySales>();
	for (let offset = -(CHART_DAYS - 1); offset <= 0; offset++) {
		const key = shopDayKey(startOfShopDay(now, offset, timeZone), timeZone);
		byDay.set(key, { day: key, netInCents: 0, orders: 0 });
	}
	for (const order of orders) {
		const entry = byDay.get(shopDayKey(order.createdAt, timeZone));
		if (!entry) continue;
		entry.netInCents += netOf(order);
		entry.orders += 1;
	}

	return {
		today,
		week,
		month,
		monthAverageInCents:
			month.current.paidOrders > 0
				? Math.round(month.current.netInCents / month.current.paidOrders)
				: null,
		daily: Array.from(byDay.values()),
	};
};

export type DashboardSales = ReturnType<typeof summarizeDashboardSales>;

// The earliest order the dashboard needs: the start of last month or of the
// chart's first day, whichever is earlier.
export const salesWindowStart = (now: Date, timeZone = SHOP_TIME_ZONE) =>
	new Date(
		Math.min(
			startOfShopMonth(now, -1, timeZone).getTime(),
			startOfShopDay(now, -(CHART_DAYS - 1), timeZone).getTime(),
			startOfShopDay(now, -13, timeZone).getTime()
		)
	);
