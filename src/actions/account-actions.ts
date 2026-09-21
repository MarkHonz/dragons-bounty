'use server';

import z from 'zod';
import { revalidatePath } from 'next/cache';

import { verifyAuthSession } from '@/lib/auth';
import { verifyPassword } from '@/lib/hash';
import { maskEmail } from '@/lib/mask-email';
import { MAX_PASSWORD_LENGTH } from '@/lib/password-rules';
import {
	changePasswordBlockedMessage,
	tooManyRequestsMessage,
} from '@/lib/attempt-limits';
import { getClientIp } from '@/lib/client-ip';
import {
	sendEmailChangeConfirmEmail,
	sendEmailChangedEmail,
	sendEmailChangeRequestedEmail,
	sendVerificationEmail,
} from '@/lib/notifications';
import { beginAttempt, clearAttempts } from '@/db/auth-attempts-db';
import {
	cancelEmailChange,
	confirmEmailChange,
	createEmailChange,
} from '@/db/email-change-db';
import {
	createVerificationToken,
	deleteOtherSessions,
	findUserByEmailIgnoringCase,
	getUserById,
	lastVerificationRequestAt,
} from '@/db/user-db';

type Response = { errors: string[]; success: boolean };
const newResponse = (): Response => ({ errors: [], success: false });

const serverUrl = () => process.env.NEXT_PUBLIC_SERVER_URL;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const passwordMatches = (stored: string, supplied: string) => {
	try {
		return verifyPassword(stored, supplied);
	} catch {
		return false;
	}
};

// --- change the email address (step 1: ask; nothing changes yet) ---

const newEmailSchema = z.string().trim().email().max(254);

export const requestEmailChangeAction = async (
	previousState: object,
	formData: FormData
) => {
	const response = newResponse();

	const { user: sessionUser } = await verifyAuthSession();
	if (!sessionUser) {
		response.errors.push('Please sign in to change your email address.');
		return response;
	}

	const parsed = newEmailSchema.safeParse(formData.get('newEmail'));
	if (!parsed.success) {
		response.errors.push('Please enter a valid email address.');
		return response;
	}
	const newEmail = parsed.data;
	const current = formData.get('currentPassword');
	if (typeof current !== 'string' || current === '') {
		response.errors.push('Please enter your current password.');
		return response;
	}

	const ip = getClientIp();

	// The password is checked (and wrong tries limited) exactly as when changing
	// the password: this is just as sensitive.
	let passwordAttempt;
	try {
		passwordAttempt = await beginAttempt('CHANGE_PASSWORD', sessionUser.id, ip);
	} catch (error) {
		console.error('Failed to check the password attempt limit', error);
		response.errors.push('Please try again in a moment.');
		return response;
	}
	if (!passwordAttempt.allowed) {
		response.errors.push(
			changePasswordBlockedMessage(passwordAttempt.retryAfterMs)
		);
		return response;
	}
	const user = await getUserById(sessionUser.id);
	if (
		!user ||
		current.length > MAX_PASSWORD_LENGTH ||
		!passwordMatches(user.password, current)
	) {
		response.errors.push('Your current password is incorrect.');
		return response;
	}
	await clearAttempts('CHANGE_PASSWORD', sessionUser.id);

	const lower = newEmail.toLowerCase();
	if (lower === user.email.toLowerCase()) {
		response.errors.push("That's already your email address.");
		return response;
	}
	const taken = await findUserByEmailIgnoringCase(lower);
	if (taken && taken.id !== user.id) {
		response.errors.push('That email address is already in use.');
		return response;
	}

	// Emails can't be made to flow without limit: per account, and per target
	// address (so nobody's inbox can be flooded through this form).
	try {
		const byAccount = await beginAttempt('EMAIL_CHANGE', user.id, ip);
		if (!byAccount.allowed) {
			response.errors.push(tooManyRequestsMessage(byAccount.retryAfterMs));
			return response;
		}
		const byTarget = await beginAttempt('EMAIL_CHANGE_TARGET', lower, ip);
		if (!byTarget.allowed) {
			response.errors.push(tooManyRequestsMessage(byTarget.retryAfterMs));
			return response;
		}
	} catch (error) {
		console.error('Failed to check the email change limit', error);
		response.errors.push('Please try again in a moment.');
		return response;
	}

	const token = await createEmailChange(user.id, newEmail);
	const name = user.profile?.name ?? 'there';

	// to the NEW address: the link that finishes the change
	try {
		await sendEmailChangeConfirmEmail({
			name,
			email: newEmail,
			confirmUrl: `${serverUrl()}/confirm-email-change?token=${token}`,
		});
	} catch (error) {
		console.error('Failed to send the email change confirmation', error);
	}
	// to the CURRENT address: a heads-up, so the owner knows even if someone else asked
	try {
		await sendEmailChangeRequestedEmail({
			name,
			email: user.email,
			maskedNewEmail: maskEmail(newEmail),
			forgotPasswordUrl: `${serverUrl()}/forgot-password`,
		});
	} catch (error) {
		console.error('Failed to send the email change notice', error);
	}

	revalidatePath('/account');
	response.success = true;
	return response;
};

export const cancelEmailChangeAction = async () => {
	const response = newResponse();
	const { user } = await verifyAuthSession();
	if (!user) {
		response.errors.push('Please sign in.');
		return response;
	}
	await cancelEmailChange(user.id);
	revalidatePath('/account');
	response.success = true;
	return response;
};

// --- change the email address (step 2: the link from the new address) ---

export const confirmEmailChangeAction = async (token: string) => {
	const response = newResponse();

	const { user, session } = await verifyAuthSession();
	if (!user || !session) {
		response.errors.push('Please sign in to confirm the change.');
		return response;
	}

	const result = await confirmEmailChange(token, user.id);
	if (!result.ok) {
		response.errors.push(
			result.reason === 'taken'
				? 'That email address has been taken by another account in the meantime.'
				: 'This link is invalid, has expired, or belongs to a different account.'
		);
		return response;
	}

	// like a password change: every other device is signed out, this one stays
	await deleteOtherSessions(user.id, session.id);

	// the old address is told, so the previous owner of it hears about the change
	try {
		await sendEmailChangedEmail({
			name: result.name ?? 'there',
			email: result.oldEmail,
			maskedNewEmail: maskEmail(result.newEmail),
			forgotPasswordUrl: `${serverUrl()}/forgot-password`,
		});
	} catch (error) {
		console.error('Failed to send the email changed notice', error);
	}

	// (no revalidatePath here: this runs on the confirmation page itself, and a
	// refresh of it would re-check the link, which has just been used, and replace
	// the "Email Changed" message with "Invalid or Expired Link". The account page
	// is always fetched fresh anyway.)
	response.success = true;
	return response;
};

// --- sign out everywhere else ---

export const signOutOtherDevicesAction = async () => {
	const response: Response & { count: number } = { ...newResponse(), count: 0 };
	const { user, session } = await verifyAuthSession();
	if (!user || !session) {
		response.errors.push('Please sign in.');
		return response;
	}
	response.count = await deleteOtherSessions(user.id, session.id);
	revalidatePath('/account');
	response.success = true;
	return response;
};

// --- resend the "verify your email" message ---

const RESEND_GAP_MS = 60 * 1000;

export const resendVerificationAction = async () => {
	const response = newResponse();
	const { user: sessionUser } = await verifyAuthSession();
	if (!sessionUser) {
		response.errors.push('Please sign in.');
		return response;
	}
	const user = await getUserById(sessionUser.id);
	if (!user) {
		response.errors.push('Please sign in.');
		return response;
	}
	if (user.emailVerified) {
		response.errors.push('Your email address is already verified.');
		return response;
	}

	// not more than one a minute, and a cap over a longer time
	const last = await lastVerificationRequestAt(user.id);
	if (last && Date.now() - last.getTime() < RESEND_GAP_MS) {
		response.errors.push(
			'We just sent one. Please check your inbox, or wait a minute.'
		);
		return response;
	}
	try {
		const attempt = await beginAttempt('VERIFY_RESEND', user.id, getClientIp());
		if (!attempt.allowed) {
			response.errors.push(tooManyRequestsMessage(attempt.retryAfterMs));
			return response;
		}
	} catch (error) {
		console.error('Failed to check the verification email limit', error);
		response.errors.push('Please try again in a moment.');
		return response;
	}

	const token = await createVerificationToken(
		user.id,
		'EMAIL_VERIFY',
		new Date(Date.now() + ONE_DAY_MS)
	);
	await sendVerificationEmail({
		name: user.profile?.name ?? 'there',
		email: user.email,
		verifyUrl: `${serverUrl()}/verify-email?token=${token}`,
	});

	response.success = true;
	return response;
};
