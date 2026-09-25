'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { setArtistStatusAction } from '@/actions/artist-actions';
import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useHydrated } from '@/lib/use-hydrated';

const MAX_NAME = 60;

// Make a customer an artist (with the public "Made by" name), rename them, or
// remove the status. The server enforces every rule; this only explains them.
export default function ArtistControls({
	userId,
	label,
	isArtist,
	artistName,
	emailVerified,
	unshippedCount,
}: {
	userId: string;
	label: string;
	isArtist: boolean;
	artistName: string | null;
	emailVerified: boolean;
	unshippedCount: number;
}) {
	const router = useRouter();
	const hydrated = useHydrated();
	const inputId = useId();
	const [nameOpen, setNameOpen] = useState(false);
	const [removeOpen, setRemoveOpen] = useState(false);
	const [name, setName] = useState(artistName ?? '');
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);

	const makeReason =
		!isArtist && !emailVerified
			? "Their email address isn't verified, so they can't be made an artist."
			: null;

	const save = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSaving(true);
		setError('');
		const result = await setArtistStatusAction(userId, true, name);
		setSaving(false);
		if (!result.ok) {
			setError(result.message);
			return;
		}
		toast.success(result.message);
		setNameOpen(false);
		router.refresh();
	};

	return (
		<div className="space-y-2 border-t border-border pt-4">
			<div className="flex flex-wrap items-center gap-3">
				<span className="text-sm text-muted-foreground">Artist</span>
				<Badge variant={isArtist ? 'default' : 'outline'}>
					{isArtist ? 'Artist' : 'Not an artist'}
				</Badge>
				{isArtist && artistName && (
					<span className="font-semibold">&ldquo;{artistName}&rdquo;</span>
				)}
			</div>
			{isArtist && (
				<p className="text-sm">
					<Link href={`/artist/${userId}`} className="text-primary underline">
						Open their artist page
					</Link>
					{unshippedCount > 0 && (
						<span className="text-muted-foreground">
							{' '}
							&middot; {unshippedCount}{' '}
							{unshippedCount === 1 ? 'order' : 'orders'} waiting for them to ship
						</span>
					)}
				</p>
			)}
			<div className="flex flex-wrap gap-2">
				<Button
					type="button"
					variant={isArtist ? 'outline' : 'default'}
					className="rounded-full"
					disabled={!hydrated || makeReason !== null}
					onClick={() => {
						setName(artistName ?? '');
						setError('');
						setNameOpen(true);
					}}
				>
					{isArtist ? 'Change artist name' : 'Make artist'}
				</Button>
				{isArtist && (
					<Button
						type="button"
						variant="outline"
						className="rounded-full"
						disabled={!hydrated}
						onClick={() => setRemoveOpen(true)}
					>
						Remove artist status
					</Button>
				)}
			</div>
			{makeReason && <p className="text-sm text-muted-foreground">{makeReason}</p>}

			<Dialog open={nameOpen} onOpenChange={(open) => !saving && setNameOpen(open)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{isArtist ? 'Change artist name' : `Make ${label} an artist`}</DialogTitle>
						<DialogDescription>
							{isArtist
								? 'This is the "Made by" name shoppers see on their products.'
								: 'They will get an artist page listing their products and the orders they need to ship. Shoppers see this name as "Made by" on their products. It does not give them admin access.'}
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={save} className="flex flex-col gap-2" noValidate>
						<Label htmlFor={inputId}>Artist name</Label>
						<Input
							id={inputId}
							value={name}
							onChange={(event) => setName(event.target.value)}
							maxLength={MAX_NAME}
							autoComplete="off"
						/>
						{error && (
							<p className="text-sm font-medium text-destructive" role="alert">
								{error}
							</p>
						)}
						<DialogFooter className="mt-2 gap-2">
							<Button
								type="button"
								variant="outline"
								className="rounded-full"
								disabled={saving}
								onClick={() => setNameOpen(false)}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								className="rounded-full"
								disabled={!hydrated || saving || name.trim() === ''}
							>
								{saving ? 'Saving…' : isArtist ? 'Save name' : 'Make artist'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<ConfirmDeleteDialog
				open={removeOpen}
				onOpenChange={setRemoveOpen}
				title="Remove artist status?"
				description={`${label} will lose their artist page. Their products stay on the site${
					unshippedCount > 0
						? `, and ${unshippedCount} ${unshippedCount === 1 ? 'order is' : 'orders are'} still waiting for them to ship: you'll need to ship ${unshippedCount === 1 ? 'it' : 'those'} from the order page`
						: ''
				}. Reassign their products on each product's edit page if needed.`}
				confirmLabel="Remove artist status"
				pendingLabel="Saving…"
				onConfirm={async () => {
					const result = await setArtistStatusAction(userId, false);
					if (!result.ok) return result.message;
					toast.success(result.message);
					router.refresh();
					return null;
				}}
			/>
		</div>
	);
}
