import { Prisma } from '@prisma/client';

import db from '@/db/db';
import { generateVerificationToken, hashToken } from '@/lib/tokens';

// A pending email change is a VerificationToken of its own type, holding the
// address the account wants to move to. Only the hash of the emailed token is
// stored (see hashToken), like password reset links.
const CHANGE_TYPE = 'EMAIL_CHANGE';
export const EMAIL_CHANGE_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours

// A token is a 64-character hex string; anything else can't be one of ours.
const TOKEN_SHAPE = /^[0-9a-f]{64}$/;

// Starts a change for this account: any earlier pending change is cancelled, so
// only the newest link works. Returns the token to email to the new address.
export const createEmailChange = async (userId: string, newEmail: string) => {
	const token = generateVerificationToken();
	await db.$transaction(async (tx) => {
		await tx.verificationToken.deleteMany({
			where: {
				type: CHANGE_TYPE,
				OR: [{ userId }, { expiresAt: { lt: new Date() } }],
			},
		});
		await tx.verificationToken.create({
			data: {
				userId,
				type: CHANGE_TYPE,
				token: hashToken(token),
				newEmail,
				expiresAt: new Date(Date.now() + EMAIL_CHANGE_LIFETIME_MS),
			},
		});
	});
	return token;
};

// The change this account has waiting, if any (and not yet expired).
export const getPendingEmailChange = async (userId: string) => {
	const row = await db.verificationToken.findFirst({
		where: { userId, type: CHANGE_TYPE, expiresAt: { gt: new Date() } },
		orderBy: { createdAt: 'desc' },
		select: { newEmail: true, expiresAt: true },
	});
	return row?.newEmail
		? { newEmail: row.newEmail, expiresAt: row.expiresAt }
		: null;
};

export const cancelEmailChange = async (userId: string) => {
	const result = await db.verificationToken.deleteMany({
		where: { userId, type: CHANGE_TYPE },
	});
	return result.count > 0;
};

// The change a link points at, when it is usable: really ours, an email change,
// not expired, and the account's newest (asking again cancels earlier links).
// Opening the link only looks; nothing changes until Confirm.
export const findUsableEmailChange = async (token: unknown) => {
	if (typeof token !== 'string' || !TOKEN_SHAPE.test(token)) return null;
	const row = await db.verificationToken.findUnique({
		where: { token: hashToken(token) },
		select: {
			id: true,
			userId: true,
			type: true,
			newEmail: true,
			expiresAt: true,
			createdAt: true,
			user: { select: { email: true } },
		},
	});
	if (
		!row ||
		row.type !== CHANGE_TYPE ||
		!row.newEmail ||
		row.expiresAt <= new Date()
	) {
		return null;
	}
	const newer = await db.verificationToken.count({
		where: {
			userId: row.userId,
			type: CHANGE_TYPE,
			createdAt: { gt: row.createdAt },
		},
	});
	if (newer > 0) return null;
	return {
		userId: row.userId,
		oldEmail: row.user.email,
		newEmail: row.newEmail,
	};
};

export type ConfirmResult =
	| { ok: true; oldEmail: string; newEmail: string; name: string | null }
	| { ok: false; reason: 'invalid' | 'taken' };

// Makes the change, using the link up in the same step, so it can't be used twice
// and two accounts can't both end up with the address. The email is marked
// verified: getting the link proves the mailbox is theirs.
export const confirmEmailChange = async (
	token: unknown,
	userId: string
): Promise<ConfirmResult> => {
	const usable = await findUsableEmailChange(token);
	// a link only ever works for the account that asked for it
	if (!usable || usable.userId !== userId)
		return { ok: false, reason: 'invalid' };
	try {
		return await db.$transaction(async (tx) => {
			// the database only refuses an exactly identical address; also refuse
			// one that differs only in capitals
			const clash = await tx.$queryRaw<{ id: string }[]>(
				Prisma.sql`SELECT "id" FROM "User" WHERE lower("email") = ${usable.newEmail.toLowerCase()} AND "id" <> ${userId} LIMIT 1`
			);
			if (clash.length > 0) return { ok: false, reason: 'taken' } as const;
			const used = await tx.verificationToken.deleteMany({
				where: { token: hashToken(token as string), userId },
			});
			if (used.count !== 1) return { ok: false, reason: 'invalid' } as const;
			const user = await tx.user.update({
				where: { id: userId },
				data: { email: usable.newEmail, emailVerified: true },
				select: { profile: { select: { name: true } } },
			});
			// nothing else pending for this account is of any use now
			await tx.verificationToken.deleteMany({
				where: { userId, type: { in: [CHANGE_TYPE, 'EMAIL_VERIFY'] } },
			});
			return {
				ok: true,
				oldEmail: usable.oldEmail,
				newEmail: usable.newEmail,
				name: user.profile?.name ?? null,
			} as const;
		});
	} catch (error) {
		// P2002: someone else took the address in the meantime
		if ((error as { code?: string }).code === 'P2002') {
			return { ok: false, reason: 'taken' };
		}
		throw error;
	}
};
