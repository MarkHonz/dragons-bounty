import { Lucia } from 'lucia';
import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
import { cookies } from 'next/headers';
import db from '../db/db';

const adapter = new PrismaAdapter(db.session, db.user);

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		expires: false,
		attributes: {
			secure: process.env.NODE_ENV === 'production',
		},
	},
	getUserAttributes: (attributes: { role?: string; id?: string }) => {
		return {
			role: attributes.role,
			id: attributes.id,
			// ...attributes,
		};
	},
});

declare module 'lucia' {
	interface Register {
		Lucia: typeof lucia;
	}
}

export const createAuthSession = async (userId: string) => {
	const session = await lucia.createSession(userId, {}); // Create a session for the user
	const sessionCookie = lucia.createSessionCookie(session.id); // Create a session cookie
	// Set the session cookie
	cookies().set(
		sessionCookie.name,
		sessionCookie.value,
		sessionCookie.attributes
	);
};

export const verifyAuthSession = async () => {
	const sessionCookie = cookies().get(lucia.sessionCookieName);
	// console.log('sessionCookie Result:', sessionCookie.result);

	if (!sessionCookie) {
		return {
			user: null,
			session: null,
		};
	}

	const sessionId = sessionCookie.value;

	if (!sessionId) {
		return {
			user: null,
			session: null,
		};
	}

	const result = await lucia.validateSession(sessionId);

	try {
		if (result.session && result.session.fresh) {
			const sessionCookie = lucia.createSessionCookie(result.session.id);
			cookies().set(
				sessionCookie.name,
				sessionCookie.value,
				sessionCookie.attributes
			);
		}
		if (!result.session) {
			const sessionCookie = lucia.createBlankSessionCookie();
			cookies().set(
				sessionCookie.name,
				sessionCookie.value,
				sessionCookie.attributes
			);
		}
	} catch (error) {
		console.error('Cookie Error:', error);
	}

	return result;
};

export const destroyAuthSession = async () => {
	const { session } = await verifyAuthSession(); // Verify the session
	// If there is no session
	if (session == null) {
		return { error: 'No user logged in.' }; // Return an error
	}

	await lucia.invalidateSession(session.id); // Invalidate the session

	const sessionCookie = lucia.createBlankSessionCookie();
	cookies().set(
		sessionCookie.name,
		sessionCookie.value,
		sessionCookie.attributes
	);
};
