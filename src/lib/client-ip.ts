import { headers } from 'next/headers';
import { isIP } from 'node:net';

// The network address a request came from, as reported by the proxy in front of
// the site (x-forwarded-for, then x-real-ip). It only counts when it really is an
// IP address; otherwise "" (unknown). If the site is ever reached directly, these
// headers can be made up by the sender, so nothing may depend on this alone.
export const getClientIp = (): string => {
	const requestHeaders = headers();
	const candidates = [
		requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim(),
		requestHeaders.get('x-real-ip')?.trim(),
	];
	for (const candidate of candidates) {
		if (candidate && isIP(candidate)) return candidate.toLowerCase();
	}
	return '';
};
