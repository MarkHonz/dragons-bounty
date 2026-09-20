// Where to send someone after they sign in or sign up. The path comes from the
// URL (?next=), so it is untrusted: only a plain path on this site is accepted.
// Anything that could leave the site is refused and the caller falls back to
// its default.
export const safeRedirectPath = (
	value: string | null | undefined
): string | null => {
	if (!value || value.length > 500) return null;
	// must be one path starting with a single "/": "//host" and "/\host" are
	// treated by browsers as another site, and "https://..." or "javascript:..."
	// don't start with "/" at all. No control characters (newlines and so on).
	if (!/^\/(?![\/\\])[^\x00-\x1f\x7f]*$/.test(value)) return null;
	// a backslash anywhere can be turned into "/" by some browsers
	if (value.includes('\\')) return null;
	return value;
};

// The sign-in page URL that brings the person back to `path` afterwards.
export const signInUrl = (path: string) => {
	const safe = safeRedirectPath(path);
	return safe ? `/sign-in?next=${encodeURIComponent(safe)}` : '/sign-in';
};
