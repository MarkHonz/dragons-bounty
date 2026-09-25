// Rules for a package's tracking number. No database access here, so both
// server and browser code can use it.

export const MIN_TRACKING_LENGTH = 4;
export const MAX_TRACKING_LENGTH = 40;

// Carrier numbers are letters and digits, sometimes written with spaces or
// dashes. Anything else (quotes, angle brackets, URLs...) is refused.
const TRACKING_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 -]*[A-Za-z0-9]$/;

export type TrackingCheck =
	| { ok: true; value: string }
	| { ok: false; error: string };

// Trims and collapses runs of spaces, then checks the result.
export const checkTrackingNumber = (raw: unknown): TrackingCheck => {
	const value = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
	if (!value) return { ok: false, error: 'Enter the tracking number.' };
	if (value.length < MIN_TRACKING_LENGTH || value.length > MAX_TRACKING_LENGTH) {
		return {
			ok: false,
			error: `A tracking number is ${MIN_TRACKING_LENGTH} to ${MAX_TRACKING_LENGTH} characters.`,
		};
	}
	if (!TRACKING_PATTERN.test(value)) {
		return {
			ok: false,
			error: 'Use only letters, numbers, spaces and dashes.',
		};
	}
	return { ok: true, value };
};

// "" is the shop's own seller id on order lines and packages
export const SHOP_SELLER_ID = '';
