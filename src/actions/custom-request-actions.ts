'use server';

import { revalidatePath } from 'next/cache';

import { logActivity } from '@/db/activity-db';
import { beginAttempt } from '@/db/auth-attempts-db';
import { createCustomRequest, setCustomRequestStatus } from '@/db/custom-request-db';
import { addRequestNote, deleteRequestNote } from '@/db/request-notes-db';
import { MAX_NOTE_LENGTH } from '@/lib/order-notes';
import { getOtherAdmins } from '@/db/user-db';
import { tooManyRequestsMessage } from '@/lib/attempt-limits';
import { assertAdminOrThrow, verifyAuthSession } from '@/lib/auth';
import { getClientIp } from '@/lib/client-ip';
import {
	checkCustomRequest,
	type CustomRequestErrors,
	type CustomRequestInput,
	parseRequestStatus,
	STATUS_LABELS,
} from '@/lib/custom-request-rules';
import { sendCustomRequestEmail } from '@/lib/notifications';

export type SubmitCustomRequestResult =
	| { ok: true; name: string; contactBy: string }
	| { ok: false; errors: CustomRequestErrors; message?: string };

// The public custom-art form. Everything is checked here, whatever the form
// allowed; who is signed in comes from the session, never from the form.
export const submitCustomRequestAction = async (
	input: CustomRequestInput & { website?: unknown }
): Promise<SubmitCustomRequestResult> => {
	if (typeof input !== 'object' || input === null) {
		return { ok: false, errors: {}, message: 'Something went wrong. Please try again.' };
	}

	const check = checkCustomRequest(input);
	if (!check.ok) return { ok: false, errors: check.errors };
	const request = check.value;
	const contactBy =
		request.email && (!request.phone || request.preferredContact !== 'PHONE')
			? request.email
			: (request.phone as string);

	// A hidden field people never see: anything in it is a bot. It is told
	// "thanks" so it learns nothing, but nothing is saved or sent.
	if (typeof input.website === 'string' && input.website.trim() !== '') {
		console.log('[custom-request] honeypot filled; ignored');
		return { ok: true, name: request.name, contactBy };
	}

	// at most a few requests per sender (and per network) in a short time
	const sender = request.email ?? (request.phone as string).replace(/\D/g, '');
	let decision;
	try {
		decision = await beginAttempt('CONTACT', sender, getClientIp());
	} catch (error) {
		console.error('Custom request limiter failed', error);
		return { ok: false, errors: {}, message: 'Something went wrong. Please try again.' };
	}
	if (!decision.allowed) {
		return { ok: false, errors: {}, message: tooManyRequestsMessage(decision.retryAfterMs) };
	}

	const { user } = await verifyAuthSession();
	let saved;
	try {
		saved = await createCustomRequest(request, user?.id ?? null);
	} catch (error) {
		console.error('Failed to save a custom request', error);
		return { ok: false, errors: {}, message: 'Something went wrong. Please try again.' };
	}

	// Every admin hears about it, each in their own email (no one sees the
	// others' addresses). The request is already saved, so a failed email
	// never loses it.
	try {
		const admins = await getOtherAdmins([]);
		for (const admin of admins) {
			try {
				await sendCustomRequestEmail({
					email: admin.email,
					adminName: admin.name ?? 'there',
					request,
					requestUrl: `${process.env.NEXT_PUBLIC_SERVER_URL}/admin/requests/${saved.id}`,
				});
			} catch (error) {
				console.error('Failed to email an admin about a custom request', error);
			}
		}
	} catch (error) {
		console.error('Failed to notify admins about a custom request', error);
	}

	revalidatePath('/admin/requests');
	revalidatePath('/admin');
	return { ok: true, name: request.name, contactBy };
};

// Admin only: mark a request New, Replied or Closed.
export const setCustomRequestStatusAction = async (
	id: string,
	status: string
): Promise<{ ok: boolean; message: string }> => {
	const { user: admin } = await assertAdminOrThrow();
	const next = parseRequestStatus(status);
	if (typeof id !== 'string' || !id || !next) {
		return { ok: false, message: 'Request not found.' };
	}
	let before;
	try {
		before = await setCustomRequestStatus(id, next);
	} catch (error) {
		console.error('Failed to change a custom request status', error);
		return { ok: false, message: "Couldn't save that. Please try again." };
	}
	if (!before) return { ok: false, message: 'Request not found.' };
	if (before.status === next) return { ok: true, message: 'Nothing to change.' };

	await logActivity(
		admin.id,
		'CUSTOMER',
		`Marked the custom art request from ${before.name} as ${STATUS_LABELS[next]}`
	);
	revalidatePath('/admin/requests');
	revalidatePath(`/admin/requests/${id}`);
	revalidatePath('/admin');
	return { ok: true, message: `Marked as ${STATUS_LABELS[next]}.` };
};

// Admin only: add a note to a request. The log says a note was added, not what
// it says.
export const addRequestNoteAction = async (requestId: string, body: string) => {
	const { user: admin } = await assertAdminOrThrow();

	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	if (typeof requestId !== 'string' || typeof body !== 'string') {
		response.errors.push('Invalid note.');
		return response;
	}
	const text = body.trim();
	if (text.length === 0) {
		response.errors.push('Write something first.');
		return response;
	}
	if (text.length > MAX_NOTE_LENGTH) {
		response.errors.push(`Notes can be up to ${MAX_NOTE_LENGTH} characters.`);
		return response;
	}

	let name;
	try {
		name = await addRequestNote(requestId, admin.id, text);
	} catch (error) {
		console.error('Failed to add a request note', error);
		response.errors.push('Failed to save the note. Please try again.');
		return response;
	}
	if (name === null) {
		response.errors.push('Request not found.');
		return response;
	}

	await logActivity(
		admin.id,
		'CUSTOMER',
		`Added a note to the custom art request from ${name}`
	);
	revalidatePath('/admin/requests');
	revalidatePath(`/admin/requests/${requestId}`);
	response.success = true;
	return response;
};

// Admin only: delete a note from a request.
export const deleteRequestNoteAction = async (noteId: string) => {
	const { user: admin } = await assertAdminOrThrow();

	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	const deleted =
		typeof noteId === 'string' ? await deleteRequestNote(noteId) : null;
	if (!deleted) {
		response.errors.push('That note no longer exists.');
		return response;
	}

	await logActivity(
		admin.id,
		'CUSTOMER',
		`Deleted a note from the custom art request from ${deleted.name}`
	);
	revalidatePath('/admin/requests');
	revalidatePath(`/admin/requests/${deleted.requestId}`);
	response.success = true;
	return response;
};
