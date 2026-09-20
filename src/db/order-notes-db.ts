import db from '@/db/db';

export type OrderNoteRow = {
	id: string;
	body: string;
	createdAt: Date;
	authorEmail: string;
	authorName: string | null;
};

export const getOrderNotes = async (orderId: string): Promise<OrderNoteRow[]> =>
	db.orderNote.findMany({
		where: { orderId },
		orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
		select: {
			id: true,
			body: true,
			createdAt: true,
			authorEmail: true,
			authorName: true,
		},
	});

// Resolves to null when the order doesn't exist. The author's email and name are
// copied in so the note still reads correctly if the account changes.
export const addOrderNote = async (
	orderId: string,
	authorId: string,
	body: string
) => {
	const [order, author] = await Promise.all([
		db.order.findUnique({ where: { id: orderId }, select: { id: true } }),
		db.user.findUnique({
			where: { id: authorId },
			select: { email: true, profile: { select: { name: true } } },
		}),
	]);
	if (!order || !author) return null;
	return db.orderNote.create({
		data: {
			orderId,
			authorId,
			authorEmail: author.email,
			authorName: author.profile?.name ?? null,
			body,
		},
	});
};

// Resolves to the deleted note's order id, or null when there was no such note.
export const deleteOrderNote = async (noteId: string) => {
	const note = await db.orderNote.findUnique({
		where: { id: noteId },
		select: { orderId: true },
	});
	if (!note) return null;
	const result = await db.orderNote.deleteMany({ where: { id: noteId } });
	return result.count > 0 ? note.orderId : null;
};
