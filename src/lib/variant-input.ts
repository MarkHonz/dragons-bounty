import { parsePriceToCents } from '@/lib/formatters';
import { MAX_VARIANTS, MAX_VARIANT_NAME_LENGTH } from '@/lib/variants';

// One option as it is checked and ready to save.
export type ParsedVariant = {
	// set for an option that already exists, so it is updated rather than replaced
	id?: string;
	name: string;
	// null = use the product's price
	priceInCents: number | null;
	quantity: number;
};

type ParseResult = { variants: ParsedVariant[] } | { error: string };

// Checks the options the admin form sends (a JSON list of {id?, name, price,
// quantity}, everything as text). This is the authoritative check; the form only
// mirrors it so mistakes show up early. An empty or missing list is valid: most
// products have no options.
export const parseVariantInputs = (raw: unknown): ParseResult => {
	if (raw == null || raw === '') return { variants: [] };
	if (typeof raw !== 'string') return { error: 'Invalid options' };

	let list: unknown;
	try {
		list = JSON.parse(raw);
	} catch {
		return { error: 'Invalid options' };
	}
	if (!Array.isArray(list)) return { error: 'Invalid options' };
	if (list.length > MAX_VARIANTS) {
		return { error: `A product can have at most ${MAX_VARIANTS} options` };
	}

	const variants: ParsedVariant[] = [];
	const seen = new Set<string>();
	for (const item of list) {
		if (typeof item !== 'object' || item === null) {
			return { error: 'Invalid options' };
		}
		const { id, name, price, quantity } = item as Record<string, unknown>;

		const trimmed = typeof name === 'string' ? name.trim() : '';
		if (trimmed.length < 1) return { error: 'Every option needs a name' };
		if (trimmed.length > MAX_VARIANT_NAME_LENGTH) {
			return {
				error: `Option names can be at most ${MAX_VARIANT_NAME_LENGTH} characters`,
			};
		}
		const key = trimmed.toLowerCase();
		if (seen.has(key)) return { error: `Two options are named "${trimmed}"` };
		seen.add(key);

		let priceInCents: number | null = null;
		if (price !== undefined && price !== null && String(price).trim() !== '') {
			priceInCents = parsePriceToCents(String(price));
			if (priceInCents === null) {
				return { error: 'Enter option prices like 29.99, or leave them blank' };
			}
		}

		if (typeof quantity !== 'string' && typeof quantity !== 'number') {
			return { error: 'Every option needs a stock number' };
		}
		const quantityText = String(quantity).trim();
		if (!/^\d{1,7}$/.test(quantityText)) {
			return { error: 'Option stock must be a whole number, 0 or more' };
		}

		if (id !== undefined && id !== null && (typeof id !== 'string' || id.length !== 25)) {
			return { error: 'Invalid options' };
		}

		variants.push({
			...(typeof id === 'string' && id ? { id } : {}),
			name: trimmed,
			priceInCents,
			quantity: parseInt(quantityText, 10),
		});
	}
	return { variants };
};
