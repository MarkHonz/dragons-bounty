'use client';

import { useState } from 'react';

import { requestEmailChangeAction } from '@/actions/account-actions';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useHydrated } from '@/lib/use-hydrated';

// Asks for a new email address (and the current password, since this is as
// sensitive as changing the password). Nothing changes until the link sent to the
// new address is used, so on success this says where the link went.
export default function ChangeEmailForm({
	currentEmail,
	onDone,
}: {
	currentEmail: string;
	onDone?: () => void;
}) {
	const hydrated = useHydrated();
	const [newEmail, setNewEmail] = useState('');
	const [password, setPassword] = useState('');
	const [errors, setErrors] = useState<string[]>([]);
	const [saving, setSaving] = useState(false);
	const [sentTo, setSentTo] = useState<string | null>(null);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData();
		formData.append('newEmail', newEmail);
		formData.append('currentPassword', password);
		setSaving(true);
		setErrors([]);
		const result = await requestEmailChangeAction({}, formData);
		setSaving(false);
		setPassword('');
		if (!result.success) {
			setErrors(result.errors);
			return;
		}
		setSentTo(newEmail.trim());
	};

	if (sentTo) {
		return (
			<div className="flex flex-col gap-4 text-center">
				<p role="status">
					We&apos;ve sent a confirmation link to{' '}
					<strong className="break-all">{sentTo}</strong>. Open it while
					you&apos;re signed in to finish the change. The link works once and
					expires in 24 hours. Your email stays{' '}
					<strong className="break-all">{currentEmail}</strong> until then.
				</p>
				<Button className="rounded-full" onClick={onDone}>
					Done
				</Button>
			</div>
		);
	}

	return (
		<form className="flex flex-col gap-3" onSubmit={handleSubmit}>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="new-email" className="pl-2">
					New email address
				</Label>
				<Input
					id="new-email"
					type="email"
					autoComplete="email"
					placeholder="new email address"
					value={newEmail}
					onChange={(event) => setNewEmail(event.target.value)}
					maxLength={254}
					required
				/>
			</div>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="email-change-password" className="pl-2">
					Current password
				</Label>
				<PasswordInput
					id="email-change-password"
					autoComplete="current-password"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					required
				/>
			</div>
			<p className="pl-2 text-xs text-muted-foreground">
				We&apos;ll email a link to the new address to confirm it, and let your
				current address know.
			</p>
			{errors.length > 0 && (
				<p className="text-sm font-medium text-destructive" role="alert">
					{errors.join(' ')}
				</p>
			)}
			<Button
				type="submit"
				className="rounded-full"
				disabled={
					!hydrated || saving || newEmail.trim() === '' || password === ''
				}
			>
				{saving ? 'Sending...' : 'Send Confirmation Link'}
			</Button>
		</form>
	);
}
