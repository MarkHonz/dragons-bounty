import { Prisma } from '@prisma/client';
import db from '@/db/db';
import { generateVerificationToken } from '@/lib/tokens';

export type UserProps = {
	id: string;
	email: string;
	emailVerified: boolean;
	password?: string | null;
	profile: {
		id: string;
		name?: string | null;
		address1?: string | null;
		address2?: string | null;
		city?: string | null;
		state?: string | null;
		zip?: string | null;
		Cart: {
			id: string;
		};
	};
};

export type CreateUserProps = {
	name: string;
	email: string;
	password: string;
};

export type AddressType = {
	name: string;
	address1: string;
	address2: string;
	city: string;
	state: string;
	zip: string;
};

export const createUser = async ({
	email,
	password,
	name,
}: CreateUserProps) => {
	try {
		return await db.user.create({
			data: {
				email,
				password,
				profile: {
					create: {
						name: name,
						Cart: {
							create: {},
						},
					},
				},
			},
		});
	} catch (error) {
		// console.error(error);
		return error;
	}
};

type UpdateUserProfileProps = {
	id: string;
	name: string;
	// null clears the saved address
	address1: string | null;
	address2: string | null;
	city: string | null;
	state: string | null;
	zip: string | null;
};

export const updateUserProfile = async ({
	id,
	name,
	address1,
	address2,
	city,
	state,
	zip,
}: UpdateUserProfileProps) => {
	try {
		return await db.user.update({
			where: { id: id },
			data: {
				profile: {
					update: {
						name: name,
						address1: address1,
						address2: address2,
						city: city,
						state: state,
						zip: zip,
					},
				},
			},
		});
	} catch (error) {
		return error;
	}
};

export const getUsers = async () => {
	return await db.user.findMany({
		include: { profile: { include: { Cart: true } } },
	});
};

// Everything the admin customers table shows, and nothing more. This list is
// handed to a client component, so it must never include the password hash.
export type CustomerRow = {
	id: string;
	name: string | null;
	email: string;
	cartId: string | null;
	role: string;
	emailVerified: boolean;
	isArtist: boolean;
};

export const getCustomers = async (): Promise<CustomerRow[]> => {
	const users = await db.user.findMany({
		select: {
			id: true,
			email: true,
			role: true,
			emailVerified: true,
			isArtist: true,
			profile: { select: { name: true, Cart: { select: { id: true } } } },
		},
		orderBy: { createdAt: 'desc' },
	});

	return users.map((user) => ({
		id: user.id,
		name: user.profile?.name ?? null,
		email: user.email,
		cartId: user.profile?.Cart?.id ?? null,
		role: user.role,
		emailVerified: user.emailVerified,
		isArtist: user.isArtist,
	}));
};

export type UserRole = 'ADMIN' | 'USER';

export type ChangeRoleResult =
	| 'changed'
	| 'unchanged'
	| 'not-found'
	| 'unverified'
	| 'last-admin';

// Change a user's role. The checks, the update and the history entry run in one
// transaction, so two admins removing each other at the same moment can't leave
// the site with no admin, and a change can never happen without being recorded.
//  - only an account with a verified email can become an admin
//  - the last remaining admin can't be demoted
// `actorId` is the admin making the change. Resolves to why nothing changed, or
// 'changed'. Throws on a database error.
export const changeUserRole = async (
	id: string,
	role: UserRole,
	actorId: string
): Promise<ChangeRoleResult> => {
	return db.$transaction(async (tx) => {
		const user = await tx.user.findUnique({
			where: { id },
			select: {
				role: true,
				emailVerified: true,
				email: true,
				profile: { select: { name: true } },
			},
		});
		if (!user) return 'not-found';
		if (user.role === role) return 'unchanged';
		if (role === 'ADMIN' && !user.emailVerified) return 'unverified';
		if (role === 'USER') {
			const admins = await tx.user.count({ where: { role: 'ADMIN' } });
			if (admins <= 1) return 'last-admin';
		}
		const actor = await tx.user.findUnique({
			where: { id: actorId },
			select: { email: true, profile: { select: { name: true } } },
		});
		if (!actor) throw new Error('The admin making the change no longer exists');

		await tx.user.update({ where: { id }, data: { role } });
		// emails and names are copied in so the history still reads correctly if
		// either person is later renamed or deleted
		await tx.roleChange.create({
			data: {
				fromRole: user.role,
				toRole: role,
				targetId: id,
				targetEmail: user.email,
				targetName: user.profile?.name ?? null,
				actorId,
				actorEmail: actor.email,
				actorName: actor.profile?.name ?? null,
			},
		});
		return 'changed';
	});
};

export type RoleChangeRow = {
	id: string;
	createdAt: Date;
	fromRole: string;
	toRole: string;
	// null once that account has been deleted
	targetId: string | null;
	targetEmail: string;
	targetName: string | null;
	actorEmail: string;
	actorName: string | null;
};

// Every role change, newest first. Only what the history page shows leaves the
// database: nothing else about the accounts.
export const getRoleChanges = async (): Promise<RoleChangeRow[]> => {
	return db.roleChange.findMany({
		orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
		select: {
			id: true,
			createdAt: true,
			fromRole: true,
			toRole: true,
			targetId: true,
			targetEmail: true,
			targetName: true,
			actorEmail: true,
			actorName: true,
		},
	});
};

// The admins other than the ones named, with what an email needs. Used to tell
// the rest of the team when someone is made an admin.
export const getOtherAdmins = async (excludeIds: string[]) => {
	const admins = await db.user.findMany({
		where: { role: 'ADMIN', id: { notIn: excludeIds } },
		select: { email: true, profile: { select: { name: true } } },
	});
	return admins.map((admin) => ({
		email: admin.email,
		name: admin.profile?.name ?? null,
	}));
};

// Everything the Account page shows about a customer, and nothing more: it goes
// to components, so it must never include the password hash.
export const getAccountOverview = async (userId: string) => {
	return db.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			email: true,
			emailVerified: true,
			role: true,
			createdAt: true,
			profile: {
				select: {
					id: true,
					name: true,
					address1: true,
					address2: true,
					city: true,
					state: true,
					zip: true,
				},
			},
		},
	});
};

// How many other devices this account is signed in on (not counting this one).
export const countOtherSessions = async (userId: string, currentSessionId: string) =>
	db.session.count({
		where: {
			userId,
			id: { not: currentSessionId },
			expiresAt: { gt: new Date() },
		},
	});

// Signs the account out everywhere except the session it is asked from.
export const deleteOtherSessions = async (userId: string, currentSessionId: string) => {
	const result = await db.session.deleteMany({
		where: { userId, id: { not: currentSessionId } },
	});
	return result.count;
};

// When this account last asked for a verification email, if ever.
export const lastVerificationRequestAt = async (userId: string) => {
	const row = await db.verificationToken.findFirst({
		where: { userId, type: 'EMAIL_VERIFY' },
		orderBy: { createdAt: 'desc' },
		select: { createdAt: true },
	});
	return row?.createdAt ?? null;
};

// Replace a user's password with an already-hashed one.
export const setUserPassword = async (userId: string, hashedPassword: string) => {
	await db.user.update({
		where: { id: userId },
		data: { password: hashedPassword },
	});
};

export const deleteUser = async (id: string) => {
	return await db.user.delete({
		where: { id: id },
		include: { profile: { include: { Cart: {} } }, sessions: {} },
	});
};

export const findUserByEmail = async (email: string) => {
	return await db.user.findUnique({
		where: { email },
		include: { profile: {} },
	});
};

// The account whose email matches whatever capitals were typed. Sign-in itself
// compares exactly; this is for telling an account's owner about guessing, where
// the typed capitals shouldn't matter. `lowerEmail` must already be lower-case.
export const findUserByEmailIgnoringCase = async (lowerEmail: string) => {
	const rows = await db.$queryRaw<{ id: string; email: string }[]>(
		Prisma.sql`SELECT "id", "email" FROM "User" WHERE lower("email") = ${lowerEmail} LIMIT 1`
	);
	return rows[0] ?? null;
};

export const getUserById = async (id: string) => {
	return await db.user.findUnique({
		where: { id },
		include: {
			profile: {
				include: { Cart: {} },
			},
		},
	});
};

//get profile id by user id
export const getProfileIdByUserId = async (id: string) => {
	const user = await db.user.findUnique({
		where: { id },
		include: { profile: {} },
	});
	if (user && user.profile) {
		return user.profile.id;
	}
	return null;
};

// add address to profile
export const addUserAddress = async (
	id: string,
	address1: string,
	address2: string,
	city: string,
	state: string,
	zip: string
) => {
	try {
		return await db.user.update({
			where: { id: id },
			data: {
				profile: {
					update: {
						address1: address1,
						address2: address2,
						city: city,
						state: state,
						zip: zip,
					},
				},
			},
		});
	} catch (error) {
		return error;
	}
};

// get address by profile id
export const getAddressByProfileId = async (id: string) => {
	const profile = await db.profile.findUnique({
		where: { id },
	});
	if (profile) {
		return {
			name: profile.name,
			address1: profile.address1,
			address2: profile.address2,
			city: profile.city,
			state: profile.state,
			zip: profile.zip,
		};
	}
	return null;
};

// get profile name by profile id
export const getProfileNameById = async (id: string) => {
	const profile = await db.profile.findUnique({
		where: { id },
	});
	if (profile) {
		return profile.name;
	}
	return null;
};

// get the user (with profile) that owns a given profile id
export const getUserByProfileId = async (profileId: string) => {
	const profile = await db.profile.findUnique({
		where: { id: profileId },
		include: { user: true },
	});
	return profile?.user ?? null;
};

export const createVerificationToken = async (
	userId: string,
	type: string,
	expiresAt: Date
) => {
	const verificationToken = await db.verificationToken.create({
		data: { userId, type, token: generateVerificationToken(), expiresAt },
	});
	return verificationToken.token;
};

export const findVerificationToken = async (token: string) => {
	return await db.verificationToken.findUnique({
		where: { token },
		include: { user: true },
	});
};

export const deleteVerificationToken = async (id: string) => {
	try {
		return await db.verificationToken.delete({ where: { id } });
	} catch (error) {
		return error;
	}
};

export const markUserEmailVerified = async (userId: string) => {
	try {
		return await db.user.update({
			where: { id: userId },
			data: { emailVerified: true },
		});
	} catch (error) {
		return error;
	}
};
