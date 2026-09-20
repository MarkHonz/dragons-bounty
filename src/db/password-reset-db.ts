import db from '@/db/db';
import { generateVerificationToken, hashToken } from '@/lib/tokens';

// Password reset links live in the VerificationToken table, alongside the email
// verification ones, with their own type. Only the hash of a link's token is
// stored (see hashToken).
const RESET_TYPE = 'PASSWORD_RESET';

export const RESET_LINK_LIFETIME_MS = 60 * 60 * 1000; // 1 hour
const MIN_GAP_MS = 60 * 1000; // one link a minute...
const MAX_PER_HOUR = 3; // ...and three an hour, per account

// Makes a fresh link for this account and returns its token (to be emailed), or
// null when the account has asked too often lately. The caller answers the same
// either way, so the limit can't be used to learn anything.
export const createPasswordResetToken = async (
	userId: string
): Promise<string | null> => {
	return db.$transaction(async (tx) => {
		const now = Date.now();
		// expired links are of no use to anyone
		await tx.verificationToken.deleteMany({
			where: { type: RESET_TYPE, expiresAt: { lt: new Date(now) } },
		});
		const recent = await tx.verificationToken.findMany({
			where: {
				userId,
				type: RESET_TYPE,
				createdAt: { gte: new Date(now - 60 * 60 * 1000) },
			},
			orderBy: { createdAt: 'desc' },
			select: { createdAt: true },
		});
		if (recent.length >= MAX_PER_HOUR) return null;
		if (recent[0] && now - recent[0].createdAt.getTime() < MIN_GAP_MS) {
			return null;
		}
		const token = generateVerificationToken();
		await tx.verificationToken.create({
			data: {
				userId,
				type: RESET_TYPE,
				token: hashToken(token),
				expiresAt: new Date(now + RESET_LINK_LIFETIME_MS),
			},
		});
		return token;
	});
};

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

// A token is a 64-character hex string; anything else can't be one of ours.
const TOKEN_SHAPE = /^[0-9a-f]{64}$/;

// The link's row when it is usable: really ours, a reset link, not expired, and
// the newest one for the account (asking again cancels the earlier links).
const findUsableLink = async (client: Tx | typeof db, token: unknown) => {
	if (typeof token !== 'string' || !TOKEN_SHAPE.test(token)) return null;
	const row = await client.verificationToken.findUnique({
		where: { token: hashToken(token) },
		select: {
			id: true,
			userId: true,
			type: true,
			expiresAt: true,
			createdAt: true,
		},
	});
	if (!row || row.type !== RESET_TYPE || row.expiresAt <= new Date())
		return null;
	const newer = await client.verificationToken.count({
		where: {
			userId: row.userId,
			type: RESET_TYPE,
			createdAt: { gt: row.createdAt },
		},
	});
	return newer === 0 ? row : null;
};

// Whether this link can still be used, without using it up. Opening the page from
// an email link only checks; nothing changes until the new password is sent.
export const isPasswordResetTokenUsable = async (token: unknown) =>
	(await findUsableLink(db, token)) !== null;

export type ResetResult = {
	userId: string;
	email: string;
	name: string | null;
};

// Uses the link up and sets the new password in one step, so a link can never be
// used twice, even by two requests at once. Also marks the email address
// verified: getting the link proves the mailbox is theirs. Resolves to null when
// the link is not usable.
export const resetPasswordWithToken = async (
	token: unknown,
	hashedPassword: string
): Promise<ResetResult | null> => {
	return db.$transaction(async (tx) => {
		const link = await findUsableLink(tx, token);
		if (!link) return null;
		// whoever deletes the row first wins; the other request finds nothing
		const used = await tx.verificationToken.deleteMany({
			where: { id: link.id },
		});
		if (used.count !== 1) return null;
		const user = await tx.user.update({
			where: { id: link.userId },
			data: { password: hashedPassword, emailVerified: true },
			select: { id: true, email: true, profile: { select: { name: true } } },
		});
		await tx.verificationToken.deleteMany({
			where: { userId: link.userId, type: RESET_TYPE },
		});
		return {
			userId: user.id,
			email: user.email,
			name: user.profile?.name ?? null,
		};
	});
};

// Cancels every outstanding reset link for an account (after a password change).
export const cancelPasswordResetTokens = async (userId: string) => {
	await db.verificationToken.deleteMany({
		where: { userId, type: RESET_TYPE },
	});
};
