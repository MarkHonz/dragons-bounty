'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import {
	createDiscountCodeAction,
	updateDiscountCodeAction,
} from '@/actions/discount-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { DiscountCodeProps } from '@/db/discount-db';
import type { DiscountKind } from '@/lib/pricing';
import { useHydrated } from '@/lib/use-hydrated';

// what a code's value is called, and what to show while it is being typed
const VALUE_FIELDS: Record<
	Exclude<DiscountKind, 'FREE_SHIPPING'>,
	{ label: string; placeholder: string }
> = {
	PERCENT: { label: 'Percent off', placeholder: '10' },
	FIXED: { label: 'Amount off ($)', placeholder: '5.00' },
};

const startingValue = (code?: DiscountCodeProps) => {
	if (!code) return '';
	if (code.kind === 'PERCENT') return String(code.value);
	if (code.kind === 'FIXED') return (code.value / 100).toFixed(2);
	return '';
};

// Adds a discount code, or (when `code` is given) edits one. The code itself
// can't be renamed: past orders refer to it by name.
export default function DiscountCodeForm({
	code,
}: {
	code?: DiscountCodeProps;
}) {
	const router = useRouter();
	const hydrated = useHydrated();
	const [kind, setKind] = useState<DiscountKind>(code?.kind ?? 'PERCENT');
	const [oncePerCustomer, setOncePerCustomer] = useState(
		code?.oncePerCustomer ?? false
	);
	const [isActive, setIsActive] = useState(code?.isActive ?? true);
	const [errors, setErrors] = useState<string[]>([]);
	const [saving, setSaving] = useState(false);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		// checkboxes are sent as "on" when ticked, as a plain HTML form would
		if (oncePerCustomer) formData.set('oncePerCustomer', 'on');
		if (isActive) formData.set('isActive', 'on');
		if (code) formData.set('id', code.id);

		setSaving(true);
		setErrors([]);
		const result = code
			? await updateDiscountCodeAction({}, formData)
			: await createDiscountCodeAction({}, formData);
		setSaving(false);
		if (!result.success) {
			setErrors(result.errors);
			return;
		}
		router.push('/admin/discounts');
		router.refresh();
	};

	const valueField = kind === 'FREE_SHIPPING' ? null : VALUE_FIELDS[kind];

	return (
		<Card className="m-auto mt-4 w-full max-w-md shadow-warm-sm">
			<CardHeader>
				<CardTitle className="text-center font-display text-2xl">
					{code ? 'Edit Discount Code' : 'Add Discount Code'}
				</CardTitle>
			</CardHeader>
			<form className="flex flex-col gap-5" onSubmit={handleSubmit}>
				<CardContent className="flex flex-col gap-4">
					<label className="flex flex-col gap-1.5 text-sm font-medium">
						<span className="pl-2">Code</span>
						<Input
							name="code"
							defaultValue={code?.code ?? ''}
							placeholder="SPRING10"
							autoComplete="off"
							maxLength={30}
							readOnly={Boolean(code)}
							className={code ? 'bg-muted uppercase' : 'uppercase'}
						/>
						<span className="pl-2 text-xs font-normal text-muted-foreground">
							{code
								? "A code can't be renamed, because past orders refer to it."
								: 'Letters, numbers and dashes. Customers can type it in any case.'}
						</span>
					</label>
					<label className="flex flex-col gap-1.5 text-sm font-medium">
						<span className="pl-2">What it does</span>
						<select
							name="kind"
							value={kind}
							onChange={(event) => setKind(event.target.value as DiscountKind)}
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="PERCENT">Percent off the items</option>
							<option value="FIXED">Dollar amount off the items</option>
							<option value="FREE_SHIPPING">Free shipping</option>
						</select>
					</label>
					{valueField && (
						<label className="flex flex-col gap-1.5 text-sm font-medium">
							<span className="pl-2">{valueField.label}</span>
							<Input
								name="value"
								defaultValue={startingValue(code)}
								// a fresh value box when the type changes, so a percent isn't left in a dollar box
								key={kind}
								placeholder={valueField.placeholder}
								inputMode="decimal"
								autoComplete="off"
							/>
						</label>
					)}
					<label className="flex items-center gap-2 pl-2 text-sm font-medium">
						<Checkbox
							checked={oncePerCustomer}
							onCheckedChange={(checked) =>
								setOncePerCustomer(checked === true)
							}
						/>
						One use per customer
					</label>
					<label className="flex items-center gap-2 pl-2 text-sm font-medium">
						<Checkbox
							checked={isActive}
							onCheckedChange={(checked) => setIsActive(checked === true)}
						/>
						Active (customers can use it)
					</label>
					{errors.length > 0 && (
						<p className="text-sm font-medium text-destructive" role="alert">
							{errors.join(' ')}
						</p>
					)}
					<Button
						type="submit"
						className="rounded-full"
						disabled={!hydrated || saving}
					>
						{saving ? 'Saving...' : 'Submit'}
					</Button>
				</CardContent>
			</form>
		</Card>
	);
}
