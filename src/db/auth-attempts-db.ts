import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

import db from '@/db/db';
import {
	KEEP_ATTEMPTS_MS,
	LIMITS,
	NOTICE_GAP_MS,
	WINDOW_MS,
	waitForGroup,
} from '@/lib/attempt-limits';

// What is being limited. SIGN_IN and CHANGE_PASSWORD are wrong-password guesses;
// the others cap how often an account (or a target address) can make the site
// send emails.
export type AttemptKind =
	| 'SIGN_IN'
	| 'CHANGE_PASSWORD'
	| 'EMAIL_CHANGE'
	| 'EMAIL_CHANGE_TARGET'
	| 'VERIFY_RESEND';

export type AttemptDecision =
	| { allowed: true }
	| {
			allowed: false;
			// how long until it would be allowed
			retryAfterMs: number;
			// true when the account's owner should be emailed about this block
			notifyOwner: boolean;
	  };

// Decides whether this password attempt may go ahead, and records it if so.
//
// The whole decision is ONE statement that writes the attempt only when all three
// counts are still under their limits. A database runs a single statement as one
// indivisible step, so a flood of simultaneous guesses can't all slip past a
// check made before any of them were written, and no long transaction is held
// open (those queue up badly under load). An allowed attempt stays recorded as a
// failure until it is cleared (see clearAttempts); a refused one is never
// written, so trying again while blocked doesn't lengthen the wait.
export const beginAttempt = async (
	kind: AttemptKind,
	subject: string,
	ip: string
): Promise<AttemptDecision> => {
	const now = Date.now();
	const windowStart = new Date(now - WINDOW_MS);

	// old rows are of no use to anyone
	await db.authAttempt.deleteMany({
		where: { createdAt: { lt: new Date(now - KEEP_ATTEMPTS_MS) } },
	});

	// "" means the address isn't known: then only the per-account limit applies
	const inserted = await db.$executeRaw(Prisma.sql`
		INSERT INTO "AuthAttempt" ("id", "kind", "subject", "ip", "createdAt")
		SELECT ${randomUUID()}, ${kind}, ${subject}, ${ip}, ${new Date(now)}
		WHERE (${ip} = '' OR (
				SELECT COUNT(*) FROM "AuthAttempt"
				WHERE "kind" = ${kind} AND "subject" = ${subject} AND "ip" = ${ip}
					AND "createdAt" >= ${windowStart}
			) < ${LIMITS.perAccountPerNetwork})
			AND (
				SELECT COUNT(*) FROM "AuthAttempt"
				WHERE "kind" = ${kind} AND "subject" = ${subject}
					AND "createdAt" >= ${windowStart}
			) < ${LIMITS.perAccount}
			AND (${ip} = '' OR (
				SELECT COUNT(*) FROM "AuthAttempt"
				WHERE "kind" = ${kind} AND "ip" = ${ip}
					AND "createdAt" >= ${windowStart}
			) < ${LIMITS.perNetwork})
	`);
	if (inserted === 1) return { allowed: true };

	// Refused. Work out how long until it would be allowed, from the attempts that
	// are in the way. `now` stands in for the refused attempt itself.
	const timesOf = async (where: { subject?: string; ip?: string }) =>
		(
			await db.authAttempt.findMany({
				where: { kind, createdAt: { gte: windowStart }, ...where },
				orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
				select: { createdAt: true },
			})
		)
			.map((row) => row.createdAt.getTime())
			.concat(now);

	const perAccountPerNetwork = ip
		? waitForGroup(
				await timesOf({ subject, ip }),
				LIMITS.perAccountPerNetwork,
				now
			)
		: null;
	const perAccount = waitForGroup(
		await timesOf({ subject }),
		LIMITS.perAccount,
		now
	);
	const perNetwork = ip
		? waitForGroup(await timesOf({ ip }), LIMITS.perNetwork, now)
		: null;
	const waits = [perAccountPerNetwork, perAccount, perNetwork].filter(
		(wait): wait is number => wait !== null
	);
	// (if the window moved on in the meantime, wait the minimum)
	const retryAfterMs = waits.length > 0 ? Math.max(...waits) : 1000;

	// The owner hears about it when their own account is being guessed (not when
	// one address is merely trying many), and at most once an hour: one statement
	// again, so two refusals at the same moment can't both send an email.
	let notifyOwner = false;
	if (
		kind === 'SIGN_IN' &&
		(perAccountPerNetwork !== null || perAccount !== null)
	) {
		notifyOwner =
			(await db.$executeRaw(Prisma.sql`
				INSERT INTO "AuthAttempt" ("id", "kind", "subject", "ip", "createdAt")
				SELECT ${randomUUID()}, 'SIGN_IN_NOTICE', ${subject}, ${ip}, ${new Date(now)}
				WHERE NOT EXISTS (
					SELECT 1 FROM "AuthAttempt"
					WHERE "kind" = 'SIGN_IN_NOTICE' AND "subject" = ${subject}
						AND "createdAt" >= ${new Date(now - NOTICE_GAP_MS)}
				)
			`)) === 1;
	}
	return { allowed: false, retryAfterMs, notifyOwner };
};

// A correct password (or a reset) wipes the failures for that account, so the
// person is never left counting mistakes made before they got it right.
export const clearAttempts = async (kind: AttemptKind, subject: string) => {
	await db.authAttempt.deleteMany({ where: { kind, subject } });
};
