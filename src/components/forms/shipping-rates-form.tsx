'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { saveShippingRatesAction } from '@/actions/discount-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useHydrated } from '@/lib/use-hydrated';

const dollars = (cents: number) => (cents / 100).toFixed(2);

export default function ShippingRatesForm({
	flatRateInCents,
	freeOverInCents,
}: {
	flatRateInCents: number;
	freeOverInCents: number | null;
}) {
	const router = useRouter();
	const hydrated = useHydrated();
	const [errors, setErrors] = useState<string[]>([]);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSaving(true);
		setErrors([]);
		setSaved(false);
		const result = await saveShippingRatesAction(
			{},
			new FormData(event.currentTarget)
		);
		setSaving(false);
		if (!result.success) {
			setErrors(result.errors);
			return;
		}
		setSaved(true);
		router.refresh();
	};

	return (
		<Card className="m-auto mt-4 w-full max-w-md shadow-warm-sm">
			<CardHeader>
				<CardTitle className="text-center font-display text-2xl">
					Shipping
				</CardTitle>
			</CardHeader>
			<form className="flex flex-col gap-5" onSubmit={handleSubmit}>
				<CardContent className="flex flex-col gap-4">
					<label className="flex flex-col gap-1.5 text-sm font-medium">
						<span className="pl-2">Shipping rate ($)</span>
						<Input
							name="flatRate"
							defaultValue={dollars(flatRateInCents)}
							inputMode="decimal"
							autoComplete="off"
						/>
						<span className="pl-2 text-xs font-normal text-muted-foreground">
							Charged on every order. Enter 0 for free shipping.
						</span>
					</label>
					<label className="flex flex-col gap-1.5 text-sm font-medium">
						<span className="pl-2">Free shipping on orders of ($)</span>
						<Input
							name="freeOver"
							defaultValue={
								freeOverInCents === null ? '' : dollars(freeOverInCents)
							}
							placeholder="Leave blank for never"
							inputMode="decimal"
							autoComplete="off"
						/>
						<span className="pl-2 text-xs font-normal text-muted-foreground">
							Counted on the items after any discount code.
						</span>
					</label>
					{errors.length > 0 && (
						<p className="text-sm font-medium text-destructive" role="alert">
							{errors.join(' ')}
						</p>
					)}
					{saved && (
						<p className="text-sm font-medium text-primary" role="status">
							Saved.
						</p>
					)}
					<Button
						type="submit"
						className="rounded-full"
						disabled={!hydrated || saving}
					>
						{saving ? 'Saving...' : 'Save'}
					</Button>
				</CardContent>
			</form>
		</Card>
	);
}
