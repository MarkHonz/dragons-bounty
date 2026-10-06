'use client';

import {
	addRequestNoteAction,
	deleteRequestNoteAction,
} from '@/actions/custom-request-actions';
import NotesCard, { type NoteRow } from '@/components/notes-card';

// The Notes card on a custom art request: see NotesCard.
export default function RequestNotes({
	requestId,
	notes,
}: {
	requestId: string;
	notes: NoteRow[];
}) {
	return (
		<NotesCard
			notes={notes}
			about="request"
			onAdd={(text) => addRequestNoteAction(requestId, text)}
			onDelete={(noteId) => deleteRequestNoteAction(noteId)}
		/>
	);
}
