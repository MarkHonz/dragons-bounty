const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
	currency: 'USD',
	style: 'currency',
	minimumFractionDigits: 2,
});

export function formatCurrency(amount: number) {
	return CURRENCY_FORMATTER.format(amount);
}

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US');

export function formatNumber(number: number) {
	return NUMBER_FORMATTER.format(number);
}

// Turns a typed dollar amount such as "29.99" into whole cents (2999).
// Returns null unless it is a positive amount with at most two decimal places.
export function parsePriceToCents(value: string) {
	const trimmed = value.trim();
	if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
		return null;
	}
	const cents = Math.round(Number(trimmed) * 100);
	return cents > 0 ? cents : null;
}

// Like parsePriceToCents, but $0 is allowed (a shipping rate of "0" is free).
// Returns null unless it is a whole or two-decimal amount of $0 or more.
export function parseAmountToCents(value: string) {
	const trimmed = value.trim();
	if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
		return null;
	}
	return Math.round(Number(trimmed) * 100);
}
