'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';
import LocalTime from '@/components/local-time';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MAX_NOTE_LENGTH } from '@/lib/order-notes';
import { useHydrated } from '@/lib/use-hydrated';

export type NoteRow = {
	id: string;
	body: string;
	createdAt: Date;
	authorEmail: string;
	authorName: string | null;
};

type ActionResult = { success: boolean; errors: string[] };

// The admin-only Notes card used on orders and on custom art requests: a box to
// add a note, and the notes below it, newest first. What a note is attached to
// is up to the caller, through `onAdd` and `onDelete`.
export default function NotesCard({
	notes,
	about,
	onAdd,
	onDelete,
}: {
	notes: NoteRow[];
	// the placeholder says what the note is about: "order", "request"...
	about: string;
	onAdd: (text: string) => Promise<ActionResult>;
	onDelete: (noteId: string) => Promise<ActionResult>;
}) {
	const router = useRouter();
	const hydrated = useHydrated();
	const [text, setText] = useState('');
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState<NoteRow | null>(null);

	const handleAdd = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSaving(true);
		setError('');
		const result = await onAdd(text);
		setSaving(false);
		if (!result.success) {
			setError(result.errors.join(' '));
			return;
		}
		setText('');
		router.refresh();
	};

	return (
		<Card className="w-full shadow-warm-sm">
			<CardHeader>
				<CardTitle className="font-display text-xl">Notes</CardTitle>
				<p className="text-xs text-muted-foreground">
					Only admins see these. Customers never do.
				</p>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 text-sm">
				<form onSubmit={handleAdd} className="flex flex-col gap-2">
					<textarea
						value={text}
						onChange={(event) => setText(event.target.value)}
						aria-label="New note"
						placeholder={`Add a note about this ${about}`}
						rows={3}
						maxLength={MAX_NOTE_LENGTH}
						className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					/>
					{error && (
						<p className="text-sm font-medium text-destructive" role="alert">
							{error}
						</p>
					)}
					<div className="flex items-center justify-between gap-3">
						<span className="text-xs text-muted-foreground">
							{text.length}/{MAX_NOTE_LENGTH}
						</span>
						<Button
							type="submit"
							size="sm"
							className="rounded-full"
							disabled={!hydrated || saving || text.trim() === ''}
						>
							{saving ? 'Saving...' : 'Add note'}
						</Button>
					</div>
				</form>
				{notes.length === 0 ? (
					<p className="text-muted-foreground">No notes yet.</p>
				) : (
					<ul className="flex flex-col divide-y divide-border">
						{notes.map((note) => (
							<li key={note.id} className="flex flex-col gap-1 py-3 first:pt-0">
								{/* React escapes the text, so nothing typed here can run as HTML */}
								<p className="whitespace-pre-wrap break-words">{note.body}</p>
								<div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
									<span>
										{note.authorName || note.authorEmail} ·{' '}
										<LocalTime value={note.createdAt} />
									</span>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-7 px-2 text-destructive"
										disabled={!hydrated}
										onClick={() => setDeleting(note)}
									>
										Delete
									</Button>
								</div>
							</li>
						))}
					</ul>
				)}
			</CardContent>
			<ConfirmDeleteDialog
				open={deleting !== null}
				onOpenChange={(open) => {
					if (!open) setDeleting(null);
				}}
				title="Delete this note?"
				description="The note is removed for every admin. This can't be undone."
				onConfirm={async () => {
					if (!deleting) return null;
					const result = await onDelete(deleting.id);
					if (!result.success) return result.errors.join(' ');
					setDeleting(null);
					router.refresh();
					return null;
				}}
			/>
		</Card>
	);
}
