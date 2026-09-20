'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import {
	applyDiscountCode,
	removeDiscountCode,
} from '@/actions/discount-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useHydrated } from '@/lib/use-hydrated';

type Props = {
	// the code in the cart, if any, and what it does (e.g. "10% off")
	appliedCode: string | null;
	appliedDescription: string | null;
	// set when the applied code can't be used any more
	problem: string | null;
};

export default function DiscountCodeBox({
	appliedCode,
	appliedDescription,
	problem,
}: Props) {
	const router = useRouter();
	const hydrated = useHydrated();
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);

	const handleApply = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const form = event.currentTarget;
		setBusy(true);
		setError('');
		const result = await applyDiscountCode({}, new FormData(form));
		setBusy(false);
		if (!result.success) {
			setError(result.errors.join(' '));
			return;
		}
		form.reset();
		router.refresh();
	};

	const handleRemove = async () => {
		setBusy(true);
		setError('');
		const result = await removeDiscountCode();
		setBusy(false);
		if (!result.success) {
			setError(result.errors.join(' '));
			return;
		}
		router.refresh();
	};

	if (appliedCode) {
		return (
			<div className="flex flex-col gap-1">
				<div className="flex items-center justify-between gap-3">
					<p className="text-sm">
						<span className="font-semibold">{appliedCode}</span>
						{!problem && appliedDescription && (
							<span className="text-muted-foreground">
								{' '}
								· {appliedDescription}
							</span>
						)}
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={!hydrated || busy}
						onClick={handleRemove}
					>
						Remove
					</Button>
				</div>
				{problem && (
					<p className="text-sm font-medium text-destructive" role="alert">
						{problem}
					</p>
				)}
				{error && (
					<p className="text-sm font-medium text-destructive" role="alert">
						{error}
					</p>
				)}
			</div>
		);
	}

	return (
		<form onSubmit={handleApply} className="flex flex-col gap-1">
			<div className="flex items-center gap-2">
				<Input
					name="code"
					placeholder="Discount code"
					aria-label="Discount code"
					autoComplete="off"
					maxLength={50}
					className="h-9"
				/>
				<Button
					type="submit"
					variant="outline"
					size="sm"
					disabled={!hydrated || busy}
				>
					Apply
				</Button>
			</div>
			{error && (
				<p className="text-sm font-medium text-destructive" role="alert">
					{error}
				</p>
			)}
		</form>
	);
}
