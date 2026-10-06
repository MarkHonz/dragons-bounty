import db from '@/db/db';
import type { NoteRow } from '@/components/notes-card';

export const getRequestNotes = async (requestId: string): Promise<NoteRow[]> =>
	db.requestNote.findMany({
		where: { requestId },
		orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
		select: {
			id: true,
			body: true,
			createdAt: true,
			authorEmail: true,
			authorName: true,
		},
	});

// Resolves to the request's name, or null when the request doesn't exist. The
// author's email and name are copied in so the note still reads correctly if the
// account changes.
export const addRequestNote = async (
	requestId: string,
	authorId: string,
	body: string
) => {
	const [request, author] = await Promise.all([
		db.customRequest.findUnique({ where: { id: requestId }, select: { name: true } }),
		db.user.findUnique({
			where: { id: authorId },
			select: { email: true, profile: { select: { name: true } } },
		}),
	]);
	if (!request || !author) return null;
	await db.requestNote.create({
		data: {
			requestId,
			authorId,
			authorEmail: author.email,
			authorName: author.profile?.name ?? null,
			body,
		},
	});
	return request.name;
};

// Resolves to the deleted note's request (id and name), or null when there was no
// such note.
export const deleteRequestNote = async (noteId: string) => {
	const note = await db.requestNote.findUnique({
		where: { id: noteId },
		select: { requestId: true, request: { select: { name: true } } },
	});
	if (!note) return null;
	const result = await db.requestNote.deleteMany({ where: { id: noteId } });
	return result.count > 0
		? { requestId: note.requestId, name: note.request.name }
		: null;
};
