// Rules for the custom-art request form, in one place. No database access here,
// so the browser form and the server action check exactly the same things.

export const NAME_MIN = 2;
export const NAME_MAX = 80;
export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 2000;
export const EMAIL_MAX = 254;
export const PHONE_MAX = 20;
// how far ahead "needed by" may be
export const NEEDED_BY_MAX_DAYS = 2 * 366;

export const BUDGETS = [
	{ value: 'UNDER_50', label: 'Under $50' },
	{ value: '50_150', label: '$50–$150' },
	{ value: '150_500', label: '$150–$500' },
	{ value: '500_PLUS', label: '$500+' },
	{ value: 'NOT_SURE', label: 'Not sure' },
] as const;
export type Budget = (typeof BUDGETS)[number]['value'];

export const budgetLabel = (value: string | null | undefined) =>
	BUDGETS.find((budget) => budget.value === value)?.label ?? null;

export type PreferredContact = 'EMAIL' | 'PHONE';

export const REQUEST_STATUSES = ['NEW', 'REPLIED', 'CLOSED'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export const STATUS_LABELS: Record<RequestStatus, string> = {
	NEW: 'New',
	REPLIED: 'Replied',
	CLOSED: 'Closed',
};
export const parseRequestStatus = (value: unknown): RequestStatus | undefined =>
	REQUEST_STATUSES.find((status) => status === value);

// The form as typed. Everything arrives as text (a replayed request can send
// anything, so nothing here is trusted until checkCustomRequest says so).
export type CustomRequestInput = {
	name?: unknown;
	email?: unknown;
	phone?: unknown;
	preferredContact?: unknown;
	description?: unknown;
	budget?: unknown;
	neededBy?: unknown;
};

export type CleanCustomRequest = {
	name: string;
	email: string | null;
	phone: string | null;
	preferredContact: PreferredContact | null;
	description: string;
	budget: Budget | null;
	neededBy: string | null;
};

export type CustomRequestErrors = Partial<
	Record<'name' | 'email' | 'phone' | 'contact' | 'description' | 'budget' | 'neededBy', string>
>;

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
// one line: runs of spaces/newlines become a single space
const oneLine = (value: unknown) => text(value).replace(/\s+/g, ' ');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+().\-\s]+$/;

const pad = (n: number) => String(n).padStart(2, '0');
// "YYYY-MM-DD" of a calendar day (the day as the person sees it, local time)
const dayKey = (date: Date) =>
	`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// Checks and tidies the form. `today` decides what "in the past" means (the
// browser passes its own day; the server allows one day of slack either way,
// since the person may be in a different time zone).
export const checkCustomRequest = (
	input: CustomRequestInput,
	today: Date = new Date()
): { ok: true; value: CleanCustomRequest } | { ok: false; errors: CustomRequestErrors } => {
	const errors: CustomRequestErrors = {};

	const name = oneLine(input.name);
	if (name.length < NAME_MIN || name.length > NAME_MAX) {
		errors.name = `Please enter your name (${NAME_MIN} to ${NAME_MAX} characters).`;
	}

	const email = text(input.email).toLowerCase();
	if (email && (email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email))) {
		errors.email = 'Please enter a valid email address.';
	}

	const phone = oneLine(input.phone);
	if (phone) {
		const digits = phone.replace(/\D/g, '').length;
		if (phone.length > PHONE_MAX || !PHONE_PATTERN.test(phone) || digits < 7) {
			errors.phone = 'Please enter a valid phone number.';
		}
	}

	if (!email && !phone) {
		errors.contact = 'Give us at least one way to reach you: an email or a phone number.';
	}

	// only meaningful when both were given
	let preferredContact: PreferredContact | null = null;
	if (email && phone) {
		const choice = text(input.preferredContact);
		preferredContact = choice === 'PHONE' ? 'PHONE' : choice === 'EMAIL' ? 'EMAIL' : null;
	}

	// keep line breaks in the description (people write paragraphs), but tidy
	// trailing spaces and runs of blank lines
	const description = text(input.description)
		.replace(/\r\n?/g, '\n')
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n');
	if (description.length < DESCRIPTION_MIN) {
		errors.description = `Please tell us a little more (at least ${DESCRIPTION_MIN} characters).`;
	} else if (description.length > DESCRIPTION_MAX) {
		errors.description = `Please keep it under ${DESCRIPTION_MAX} characters.`;
	}

	const budgetRaw = text(input.budget);
	let budget: Budget | null = null;
	if (budgetRaw) {
		const match = BUDGETS.find((option) => option.value === budgetRaw);
		if (match) budget = match.value;
		else errors.budget = 'Please pick a budget from the list.';
	}

	const neededByRaw = text(input.neededBy);
	let neededBy: string | null = null;
	if (neededByRaw) {
		const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(neededByRaw);
		const date = match
			? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
			: null;
		const real = date && dayKey(date) === neededByRaw;
		const earliest = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
		const latest = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate() + NEEDED_BY_MAX_DAYS
		);
		if (!real || !date) errors.neededBy = 'Please pick a valid date.';
		else if (date < earliest) errors.neededBy = 'That date has already passed.';
		else if (date > latest) errors.neededBy = 'Please pick a date within the next two years.';
		else neededBy = neededByRaw;
	}

	if (Object.keys(errors).length > 0) return { ok: false, errors };
	return {
		ok: true,
		value: {
			name,
			email: email || null,
			phone: phone || null,
			preferredContact,
			description,
			budget,
			neededBy,
		},
	};
};

// "Fri, Oct 9, 2026" for a YYYY-MM-DD, read as a calendar day (no time zone shift)
export const formatNeededBy = (day: string | null | undefined) => {
	if (!day) return null;
	const [year, month, date] = day.split('-').map(Number);
	return new Intl.DateTimeFormat('en-US', {
		timeZone: 'UTC',
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	}).format(new Date(Date.UTC(year, month - 1, date)));
};
