'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { shipPackageAction } from '@/actions/artist-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkTrackingNumber, MAX_TRACKING_LENGTH } from '@/lib/tracking';
import { useHydrated } from '@/lib/use-hydrated';

// The tracking number box and button for one seller's package in one order.
// Used on the artist page and the admin order page. With `current` set, the
// package has already shipped and the form corrects its tracking number
// (the customer isn't emailed again).
export default function ShipPackageForm({
	orderId,
	sellerId,
	current,
}: {
	orderId: string;
	sellerId: string;
	current?: string | null;
}) {
	const router = useRouter();
	const hydrated = useHydrated();
	const inputId = useId();
	const errorId = useId();
	const [value, setValue] = useState(current ?? '');
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);
	const shipped = current !== undefined;

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const check = checkTrackingNumber(value);
		if (!check.ok) {
			setError(check.error);
			return;
		}
		setError('');
		setSaving(true);
		const result = await shipPackageAction(orderId, sellerId, check.value);
		setSaving(false);
		if (!result.ok) {
			setError(result.message);
			return;
		}
		toast.success(result.message);
		router.refresh();
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-1.5" noValidate>
			<Label htmlFor={inputId}>
				{shipped ? 'Tracking number' : 'Tracking number (required to mark shipped)'}
			</Label>
			<div className="flex flex-col gap-2 sm:flex-row">
				<Input
					id={inputId}
					value={value}
					onChange={(event) => setValue(event.target.value)}
					maxLength={MAX_TRACKING_LENGTH + 10}
					autoComplete="off"
					spellCheck={false}
					aria-invalid={error ? true : undefined}
					aria-describedby={error ? errorId : undefined}
					className="sm:max-w-xs"
				/>
				<Button
					type="submit"
					variant={shipped ? 'outline' : 'default'}
					className="rounded-full"
					disabled={!hydrated || saving || (shipped && value.trim() === (current ?? ''))}
				>
					{saving ? 'Saving...' : shipped ? 'Update tracking' : 'Mark shipped'}
				</Button>
			</div>
			{error && (
				<p id={errorId} className="text-sm font-medium text-destructive" role="alert">
					{error}
				</p>
			)}
		</form>
	);
}
