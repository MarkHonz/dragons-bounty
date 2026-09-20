// A range of calendar days for filtering orders, in the admin's own time zone.
// The admin picks dates ("Sept 1 to Sept 30"); an order placed at 11pm on the 30th
// their time belongs in that range even though it is already the 1st in UTC. So
// each day is turned into the exact moment it starts in the admin's zone, which
// also gets daylight-saving days (23 or 25 hours long) right.

export type OrderDateRange = {
	// the dates as typed (YYYY-MM-DD), null when left blank
	fromDate: string | null;
	toDate: string | null;
	// orders created at or after `start` and before `endExclusive` are in range
	start: Date | null;
	endExclusive: Date | null;
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// how far ahead of UTC the zone's clock is at that instant, in minutes
const zoneOffsetMinutes = (utcMs: number, timeZone: string) => {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
		second: 'numeric',
	}).formatToParts(new Date(utcMs));
	const get = (type: string) =>
		Number(parts.find((part) => part.type === type)?.value);
	const asIfUtc = Date.UTC(
		get('year'),
		get('month') - 1,
		get('day'),
		get('hour'),
		get('minute'),
		get('second')
	);
	return Math.round((asIfUtc - Math.floor(utcMs / 1000) * 1000) / 60000);
};

// The instant (ms since 1970) at which the given calendar day begins in the zone.
// `day` may run past the end of the month; Date.UTC rolls it over.
export const startOfDayInZone = (
	year: number,
	month: number,
	day: number,
	timeZone: string
) => {
	const guess = Date.UTC(year, month - 1, day);
	const first = guess - zoneOffsetMinutes(guess, timeZone) * 60000;
	// if the offset was different at that instant (a daylight-saving change), use
	// the offset that applies at the moment we landed on
	const second = guess - zoneOffsetMinutes(first, timeZone) * 60000;
	return second;
};

const parseDate = (value: string) => {
	const match = DATE_PATTERN.exec(value);
	if (!match) return null;
	const [year, month, day] = [
		Number(match[1]),
		Number(match[2]),
		Number(match[3]),
	];
	const check = new Date(Date.UTC(year, month - 1, day));
	const real =
		check.getUTCFullYear() === year &&
		check.getUTCMonth() === month - 1 &&
		check.getUTCDate() === day;
	return real && year >= 2000 && year <= 2100 ? { year, month, day } : null;
};

export type ParsedRange =
	{ ok: true; range: OrderDateRange } | { ok: false; message: string };

// `fromDate` and `toDate` are inclusive and either may be blank. `timeZone` is an
// IANA name such as America/Chicago; blank means UTC.
export const parseOrderDateRange = (
	fromDate: string | null | undefined,
	toDate: string | null | undefined,
	timeZone: string | null | undefined
): ParsedRange => {
	const from = fromDate?.trim() || null;
	const to = toDate?.trim() || null;
	const zone = timeZone?.trim() || 'UTC';

	try {
		new Intl.DateTimeFormat('en-US', { timeZone: zone });
	} catch {
		return { ok: false, message: 'Unknown time zone.' };
	}

	const fromParts = from ? parseDate(from) : null;
	const toParts = to ? parseDate(to) : null;
	if (from && !fromParts) {
		return {
			ok: false,
			message: 'The start date must be a real date (YYYY-MM-DD).',
		};
	}
	if (to && !toParts) {
		return {
			ok: false,
			message: 'The end date must be a real date (YYYY-MM-DD).',
		};
	}
	if (from && to && from > to) {
		return { ok: false, message: 'The start date is after the end date.' };
	}

	return {
		ok: true,
		range: {
			fromDate: from,
			toDate: to,
			start: fromParts
				? new Date(
						startOfDayInZone(
							fromParts.year,
							fromParts.month,
							fromParts.day,
							zone
						)
					)
				: null,
			// the day after the last day picked, so the whole last day is included
			endExclusive: toParts
				? new Date(
						startOfDayInZone(toParts.year, toParts.month, toParts.day + 1, zone)
					)
				: null,
		},
	};
};

// "2026-09-01 to 2026-09-30", "from 2026-09-01" or "up to 2026-09-30"
export const describeRange = (range: OrderDateRange) =>
	range.fromDate && range.toDate
		? `${range.fromDate} to ${range.toDate}`
		: range.fromDate
			? `from ${range.fromDate}`
			: range.toDate
				? `up to ${range.toDate}`
				: '';
