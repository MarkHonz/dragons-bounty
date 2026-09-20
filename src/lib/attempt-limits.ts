// How many wrong passwords are allowed before a wait, in one place. All counts are
// inside a sliding window, and include the attempt being decided.

export const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export const LIMITS = {
	// wrong tries allowed from one network address for one account
	perAccountPerNetwork: 5,
	// ... for one account from anywhere at all (stops guesses spread over many addresses)
	perAccount: 20,
	// ... from one network address across every account (stops a list of accounts being tried)
	perNetwork: 30,
} as const;

// the owner of an account is emailed about a block at most this often
export const NOTICE_GAP_MS = 60 * 60 * 1000; // 1 hour

// attempts older than this are deleted
export const KEEP_ATTEMPTS_MS = 24 * 60 * 60 * 1000;

// The email as it is counted: whatever capitals were typed, it is one account.
export const normalizeSubject = (email: string) => email.trim().toLowerCase();

// How long until an attempt in this group would be allowed, or null when the
// group is within its limit. `times` are the moments (ms) of the attempts in the
// window, oldest first, INCLUDING the one being decided (the newest). It is
// refused when there are more than `limit`; it would be allowed once enough of
// the oldest have aged out to bring the count back to `limit`.
export const waitForGroup = (
	times: number[],
	limit: number,
	now: number
): number | null => {
	const over = times.length - limit;
	if (over <= 0) return null;
	// the `over`-th oldest attempt is the last one that has to age out
	return Math.max(times[over - 1] + WINDOW_MS - now, 1000);
};

export const minutesToWait = (ms: number) => Math.max(1, Math.ceil(ms / 60000));

const minutesText = (ms: number) => {
	const minutes = minutesToWait(ms);
	return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
};

export const signInBlockedMessage = (ms: number) =>
	`Too many failed sign-in attempts. Please try again in about ${minutesText(ms)}, or reset your password.`;

export const changePasswordBlockedMessage = (ms: number) =>
	`Too many incorrect attempts. Please try again in about ${minutesText(ms)}.`;
