// The rules for a new password, shared by the forms (for quick feedback) and the
// server actions (which are the ones that count).

export const MIN_PASSWORD_LENGTH = 8;
// far more than anyone types, and it keeps the hashing work bounded
export const MAX_PASSWORD_LENGTH = 128;

// The first thing wrong with a new password, or null when it is fine. `current`
// is the password being replaced, when there is one.
export const checkNewPassword = (
	password: unknown,
	confirmation: unknown,
	current?: string
): string | null => {
	if (typeof password !== 'string' || typeof confirmation !== 'string') {
		return 'Please enter a new password.';
	}
	if (password.length < MIN_PASSWORD_LENGTH) {
		return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
	}
	if (password.length > MAX_PASSWORD_LENGTH) {
		return `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;
	}
	if (password !== confirmation) {
		return "The passwords don't match.";
	}
	if (current !== undefined && password === current) {
		return 'Choose a password different from your current one.';
	}
	return null;
};
