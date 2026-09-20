'use server';

import z from 'zod';
import { revalidatePath } from 'next/cache';

import { createAuthSession, lucia, verifyAuthSession } from '@/lib/auth';
import { hashUserPassword, verifyPassword } from '@/lib/hash';
import { checkNewPassword, MAX_PASSWORD_LENGTH } from '@/lib/password-rules';
import { findUserByEmail, getUserById, setUserPassword } from '@/db/user-db';
import {
	cancelPasswordResetTokens,
	createPasswordResetToken,
	resetPasswordWithToken,
} from '@/db/password-reset-db';
import {
	sendPasswordChangedEmail,
	sendPasswordResetEmail,
} from '@/lib/notifications';

type Response = { errors: string[]; success: boolean };
const newResponse = (): Response => ({ errors: [], success: false });

const serverUrl = () => process.env.NEXT_PUBLIC_SERVER_URL;

// A stored password that can't be read counts as a wrong password, not a crash.
const passwordMatches = (stored: string, supplied: string) => {
	try {
		return verifyPassword(stored, supplied);
	} catch {
		return false;
	}
};

// Tell the account's owner their password changed. It goes out after the change
// is saved, and a failure here never undoes or blocks it.
const sendChangedNotice = async (name: string | null, email: string) => {
	try {
		await sendPasswordChangedEmail({
			name: name ?? 'there',
			email,
			forgotPasswordUrl: `${serverUrl()}/forgot-password`,
		});
	} catch (error) {
		console.error('Failed to send the password changed email', error);
	}
};

// --- change the password of the signed-in account ---

export const changePasswordAction = async (
	previousState: object,
	formData: FormData
) => {
	const response = newResponse();

	const { user: sessionUser } = await verifyAuthSession();
	if (!sessionUser) {
		response.errors.push('Please sign in to change your password.');
		return response;
	}

	const current = formData.get('currentPassword');
	const newPassword = formData.get('newPassword');
	const confirmation = formData.get('confirmPassword');
	if (typeof current !== 'string' || current === '') {
		response.errors.push('Please enter your current password.');
		return response;
	}
	// an absurdly long "current password" is refused before any hashing work
	if (current.length > MAX_PASSWORD_LENGTH) {
		response.errors.push('Your current password is incorrect.');
		return response;
	}

	const user = await getUserById(sessionUser.id);
	if (!user || !passwordMatches(user.password, current)) {
		response.errors.push('Your current password is incorrect.');
		return response;
	}

	const problem = checkNewPassword(newPassword, confirmation, current);
	if (problem) {
		response.errors.push(problem);
		return response;
	}

	await setUserPassword(user.id, hashUserPassword(newPassword as string));
	// any reset link still in an inbox no longer works
	await cancelPasswordResetTokens(user.id);
	// every device is signed out, then this one signs straight back in
	await lucia.invalidateUserSessions(user.id);
	await createAuthSession(user.id);

	await sendChangedNotice(user.profile?.name ?? null, user.email);

	revalidatePath('/account');
	response.success = true;
	return response;
};

// --- forgot password: ask for a link ---

const emailSchema = z.string().trim().email().max(254);

// Always answers the same way once the address looks like an email, whether or
// not an account exists, so it can't be used to find out who has one.
export const requestPasswordResetAction = async (
	previousState: object,
	formData: FormData
) => {
	const response = newResponse();

	const parsed = emailSchema.safeParse(formData.get('email'));
	if (!parsed.success) {
		response.errors.push('Please enter a valid email address.');
		return response;
	}

	try {
		const user = await findUserByEmail(parsed.data);
		if (user) {
			const token = await createPasswordResetToken(user.id);
			if (token) {
				const profile = await getUserById(user.id);
				await sendPasswordResetEmail({
					name: profile?.profile?.name ?? 'there',
					email: user.email,
					resetUrl: `${serverUrl()}/reset-password?token=${token}`,
				});
			}
		}
	} catch (error) {
		// nothing here may show through in the reply
		console.error('Failed to send a password reset email', error);
	}

	response.success = true;
	return response;
};

// --- forgot password: use the link ---

export const resetPasswordAction = async (
	previousState: object,
	formData: FormData
) => {
	const response = newResponse();

	const token = formData.get('token');
	const newPassword = formData.get('newPassword');
	const confirmation = formData.get('confirmPassword');

	const problem = checkNewPassword(newPassword, confirmation);
	if (problem) {
		response.errors.push(problem);
		return response;
	}

	const result = await resetPasswordWithToken(
		token,
		hashUserPassword(newPassword as string)
	);
	if (!result) {
		response.errors.push(
			'This link is invalid or has expired. Please ask for a new one.'
		);
		return response;
	}

	// signed out everywhere, including any thief who was signed in
	await lucia.invalidateUserSessions(result.userId);
	await sendChangedNotice(result.name, result.email);

	response.success = true;
	return response;
};
