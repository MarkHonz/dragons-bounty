'use client';

import {
	addOrderNoteAction,
	deleteOrderNoteAction,
} from '@/actions/order-actions';
import NotesCard from '@/components/notes-card';
import type { OrderNoteRow } from '@/db/order-notes-db';

// The Notes card on an order: see NotesCard.
export default function OrderNotes({
	orderId,
	notes,
}: {
	orderId: string;
	notes: OrderNoteRow[];
}) {
	return (
		<NotesCard
			notes={notes}
			about="order"
			onAdd={(text) => addOrderNoteAction(orderId, text)}
			onDelete={(noteId) => deleteOrderNoteAction(noteId)}
		/>
	);
}
