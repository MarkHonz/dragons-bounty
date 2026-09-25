// The shop's own calendar. "Today" and "this month" on the dashboard and the
// artist page follow the shop's clock, not the server's (hosting usually runs
// on UTC, which would roll the day over in the early evening). No database
// access here, so server and browser code can both use it.
import { startOfDayInZone } from '@/lib/date-range';

// Change it here if the shop moves.
export const SHOP_TIME_ZONE = 'America/New_York';

export type CalendarDay = { year: number; month: number; day: number };

// The calendar date (in the shop's zone) that an instant falls on.
export const shopCalendarDay = (
	instant: Date,
	timeZone = SHOP_TIME_ZONE
): CalendarDay => {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
	}).formatToParts(instant);
	const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
	return { year: get('year'), month: get('month'), day: get('day') };
};

// "2026-09-25": the shop day an instant falls on, for grouping by day.
export const shopDayKey = (instant: Date, timeZone = SHOP_TIME_ZONE) => {
	const { year, month, day } = shopCalendarDay(instant, timeZone);
	return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// When the shop day containing `instant` began, moved by `offsetDays` whole
// days (-1 = the start of yesterday). Daylight-saving days are 23 or 25 hours
// long, which this gets right.
export const startOfShopDay = (
	instant: Date,
	offsetDays = 0,
	timeZone = SHOP_TIME_ZONE
) => {
	const { year, month, day } = shopCalendarDay(instant, timeZone);
	return new Date(startOfDayInZone(year, month, day + offsetDays, timeZone));
};

// When the shop month containing `instant` began, moved by `offsetMonths`.
export const startOfShopMonth = (
	instant: Date,
	offsetMonths = 0,
	timeZone = SHOP_TIME_ZONE
) => {
	const { year, month } = shopCalendarDay(instant, timeZone);
	// Date.UTC rolls months past 12 or below 1 into the next or previous year
	const first = new Date(Date.UTC(year, month - 1 + offsetMonths, 1));
	return new Date(
		startOfDayInZone(first.getUTCFullYear(), first.getUTCMonth() + 1, 1, timeZone)
	);
};
