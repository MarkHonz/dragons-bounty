'use client';

import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parsePriceToCents } from '@/lib/formatters';
import { MAX_VARIANTS, MAX_VARIANT_NAME_LENGTH } from '@/lib/variants';

// One option row in the form. Everything is text until it is checked on save.
export type OptionRow = {
	// only for React's list keys
	key: string;
	// set for an option that already exists on the product
	id?: string;
	name: string;
	price: string;
	quantity: string;
};

const newKey = () => Math.random().toString(36).slice(2);

export const newOptionRow = (): OptionRow => ({
	key: newKey(),
	name: '',
	price: '',
	quantity: '',
});

export const optionRowsFromProduct = (
	variants: {
		id: string;
		name: string;
		priceInCents: number | null;
		quantity: number;
	}[]
): OptionRow[] =>
	variants.map((variant) => ({
		key: variant.id,
		id: variant.id,
		name: variant.name,
		price:
			variant.priceInCents == null ? '' : (variant.priceInCents / 100).toFixed(2),
		quantity: String(variant.quantity),
	}));

// what the form sends to the server (which checks it again)
export const optionRowsPayload = (rows: OptionRow[]) =>
	JSON.stringify(
		rows.map(({ id, name, price, quantity }) => ({
			...(id ? { id } : {}),
			name,
			price,
			quantity,
		}))
	);

// A quick check so mistakes show up before saving. The server does the real one.
export const checkOptionRows = (rows: OptionRow[]): string | null => {
	const seen = new Set<string>();
	for (let index = 0; index < rows.length; index++) {
		const row = rows[index];
		const label = `Option ${index + 1}`;
		const name = row.name.trim();
		if (!name) return `${label} needs a name`;
		if (seen.has(name.toLowerCase())) return `Two options are named "${name}"`;
		seen.add(name.toLowerCase());
		if (row.price.trim() && parsePriceToCents(row.price) === null) {
			return `${label}: enter a price like 29.99, or leave it blank`;
		}
		if (!/^\d{1,7}$/.test(row.quantity.trim())) {
			return `${label}: stock must be a whole number, 0 or more`;
		}
	}
	return null;
};

type Props = {
	value: OptionRow[];
	onChange: (next: OptionRow[]) => void;
	error?: string;
};

// The optional "Options" section of the product form (sizes, colours...). While it
// has no rows the product is sold as a single item, exactly as before.
export function ProductOptionsField({ value, onChange, error }: Props) {
	const base = useId();

	const update = (key: string, patch: Partial<OptionRow>) =>
		onChange(value.map((row) => (row.key === key ? { ...row, ...patch } : row)));

	return (
		<div className="flex flex-col gap-3 rounded-md border border-border p-3">
			<div>
				<h3 className="text-sm font-semibold">Options (optional)</h3>
				<p className="text-xs text-muted-foreground">
					Add options such as sizes or colours if this product comes in more than
					one version. Each option has its own stock and, if you like, its own
					price. Leave this empty for a product with just one version.
				</p>
			</div>

			{value.map((row, index) => (
				<div
					key={row.key}
					className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 p-3"
				>
					<div className="flex items-end gap-2">
						<div className="flex-1">
							<Label htmlFor={`${base}-${row.key}-name`} className="text-xs">
								Option {index + 1} name
							</Label>
							<Input
								id={`${base}-${row.key}-name`}
								value={row.name}
								maxLength={MAX_VARIANT_NAME_LENGTH}
								placeholder="e.g. Large"
								onChange={(event) => update(row.key, { name: event.target.value })}
							/>
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							aria-label={`Remove option ${index + 1}`}
							onClick={() => onChange(value.filter((r) => r.key !== row.key))}
						>
							Remove
						</Button>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div>
							<Label htmlFor={`${base}-${row.key}-price`} className="text-xs">
								Price ($, optional)
							</Label>
							<Input
								id={`${base}-${row.key}-price`}
								type="number"
								step="0.01"
								min="0.01"
								value={row.price}
								placeholder="Optional"
								onChange={(event) => update(row.key, { price: event.target.value })}
							/>
						</div>
						<div>
							<Label htmlFor={`${base}-${row.key}-stock`} className="text-xs">
								Stock
							</Label>
							<Input
								id={`${base}-${row.key}-stock`}
								type="number"
								min="0"
								step="1"
								value={row.quantity}
								placeholder="0"
								onChange={(event) =>
									update(row.key, { quantity: event.target.value })
								}
							/>
						</div>
					</div>
				</div>
			))}

			<Button
				type="button"
				variant="outline"
				size="sm"
				className="w-fit"
				disabled={value.length >= MAX_VARIANTS}
				onClick={() => onChange([...value, newOptionRow()])}
			>
				Add an option
			</Button>
			{error && <p className="text-sm font-medium text-destructive">{error}</p>}
		</div>
	);
}
