// The money rules for an order, in one place so the cart's estimate and the
// checkout can never disagree. Everything is whole cents.

export const TAX_RATE = 0.0675;

// Stripe refuses to charge less than this
export const MINIMUM_CHARGE_IN_CENTS = 50;

export const DISCOUNT_KINDS = ['PERCENT', 'FIXED', 'FREE_SHIPPING'] as const;
export type DiscountKind = (typeof DISCOUNT_KINDS)[number];

// what a discount code does. `value` is a percent for PERCENT, cents for FIXED
// and unused for FREE_SHIPPING.
export type DiscountRule = { kind: DiscountKind; value: number };

export type ShippingRates = {
	flatRateInCents: number;
	// shipping is free once the items (after any discount) reach this; null = never
	freeOverInCents: number | null;
};

// what the shop charged for shipping before it could be changed
export const DEFAULT_SHIPPING_RATES: ShippingRates = {
	flatRateInCents: 999,
	freeOverInCents: null,
};

export type OrderTotals = {
	itemsInCents: number;
	discountInCents: number;
	shippingInCents: number;
	taxInCents: number;
	totalInCents: number;
};

export const calculateTotals = ({
	itemsInCents,
	discount,
	shipping,
}: {
	itemsInCents: number;
	discount: DiscountRule | null;
	shipping: ShippingRates;
}): OrderTotals => {
	let discountInCents = 0;
	if (discount?.kind === 'PERCENT') {
		const percent = Math.min(Math.max(discount.value, 0), 100);
		discountInCents = Math.round((itemsInCents * percent) / 100);
	} else if (discount?.kind === 'FIXED') {
		// never more than the items cost
		discountInCents = Math.min(Math.max(discount.value, 0), itemsInCents);
	}

	const itemsAfterDiscount = itemsInCents - discountInCents;
	const waivedByCode = discount?.kind === 'FREE_SHIPPING';
	const waivedByTotal =
		shipping.freeOverInCents !== null &&
		itemsAfterDiscount >= shipping.freeOverInCents;
	const shippingInCents =
		waivedByCode || waivedByTotal ? 0 : shipping.flatRateInCents;

	// tax is charged on what the customer actually pays for the items, plus shipping
	const taxInCents = Math.round(
		(itemsAfterDiscount + shippingInCents) * TAX_RATE
	);

	return {
		itemsInCents,
		discountInCents,
		shippingInCents,
		taxInCents,
		totalInCents: itemsAfterDiscount + shippingInCents + taxInCents,
	};
};

export const isChargeable = (totalInCents: number) =>
	totalInCents >= MINIMUM_CHARGE_IN_CENTS;

// "10% off", "$5.00 off" or "Free shipping"
export const describeDiscount = (
	rule: DiscountRule,
	formatMoney: (cents: number) => string
) => {
	if (rule.kind === 'PERCENT') return `${rule.value}% off`;
	if (rule.kind === 'FIXED') return `${formatMoney(rule.value)} off`;
	return 'Free shipping';
};
