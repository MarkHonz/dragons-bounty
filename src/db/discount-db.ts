import db from '@/db/db';
import {
	DEFAULT_SHIPPING_RATES,
	DiscountKind,
	DiscountRule,
	DISCOUNT_KINDS,
	ShippingRates,
} from '@/lib/pricing';

export type DiscountCodeProps = {
	id: string;
	code: string;
	kind: DiscountKind;
	value: number;
	oncePerCustomer: boolean;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export type DiscountCodeRow = DiscountCodeProps & {
	// orders that used this code and have not been refunded
	uses: number;
};

// codes are stored uppercase and matched ignoring case
export const normalizeCode = (code: string) => code.trim().toUpperCase();

const asProps = (row: {
	id: string;
	code: string;
	kind: string;
	value: number;
	oncePerCustomer: boolean;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}): DiscountCodeProps => ({
	...row,
	kind: (DISCOUNT_KINDS.find((kind) => kind === row.kind) ??
		'FIXED') as DiscountKind,
});

// --- shipping settings ---

const SHIPPING_ROW_ID = 'shop';

// No row means the shop has never changed its rates, so it keeps the defaults.
export const getShippingRates = async (): Promise<ShippingRates> => {
	const row = await db.shippingSettings.findUnique({
		where: { id: SHIPPING_ROW_ID },
	});
	if (!row) return DEFAULT_SHIPPING_RATES;
	return {
		flatRateInCents: row.flatRateInCents,
		freeOverInCents: row.freeOverInCents,
	};
};

export const saveShippingRates = async (rates: ShippingRates) => {
	await db.shippingSettings.upsert({
		where: { id: SHIPPING_ROW_ID },
		create: { id: SHIPPING_ROW_ID, ...rates },
		update: rates,
	});
};

// --- codes (admin) ---

// every code with how many orders used it. A refunded order doesn't count as a
// use, and the count is worked out from the orders so it can never drift.
export const getDiscountCodes = async (): Promise<DiscountCodeRow[]> => {
	const [codes, used] = await Promise.all([
		db.discountCode.findMany({ orderBy: { createdAt: 'desc' } }),
		db.order.groupBy({
			by: ['discountCode'],
			where: { discountCode: { not: null }, refundedAt: null },
			_count: { _all: true },
		}),
	]);
	const usesByCode = new Map(
		used.map((group) => [group.discountCode, group._count._all])
	);
	return codes.map((row) => ({
		...asProps(row),
		uses: usesByCode.get(row.code) ?? 0,
	}));
};

export const getDiscountCodeById = async (id: string) => {
	const row = await db.discountCode.findUnique({ where: { id } });
	return row ? asProps(row) : null;
};

type CodeFields = {
	kind: DiscountKind;
	value: number;
	oncePerCustomer: boolean;
	isActive: boolean;
};

// Resolves to null when the code already exists (compared ignoring case).
export const createDiscountCode = async (
	code: string,
	fields: CodeFields
): Promise<DiscountCodeProps | null> => {
	const normalized = normalizeCode(code);
	const existing = await db.discountCode.findUnique({
		where: { code: normalized },
	});
	if (existing) return null;
	try {
		return asProps(
			await db.discountCode.create({ data: { code: normalized, ...fields } })
		);
	} catch (error) {
		// someone created the same code at the same moment
		if ((error as { code?: string }).code === 'P2002') return null;
		throw error;
	}
};

export const updateDiscountCode = async (id: string, fields: CodeFields) => {
	const result = await db.discountCode.updateMany({
		where: { id },
		data: fields,
	});
	return result.count > 0;
};

export const setDiscountCodeActive = async (id: string, isActive: boolean) => {
	const result = await db.discountCode.updateMany({
		where: { id },
		data: { isActive },
	});
	return result.count > 0;
};

// Orders keep the code as text, so deleting a code never changes order history.
export const deleteDiscountCode = async (id: string) => {
	const result = await db.discountCode.deleteMany({ where: { id } });
	return result.count > 0;
};

// --- codes (customer) ---

export type CodeCheck =
	| { ok: true; code: string; rule: DiscountRule }
	| { ok: false; message: string };

// Whether this customer (identified by profile) can use this code right now.
// An unknown code and a switched-off one give the same answer, so codes can't be
// guessed at from the messages.
export const checkDiscountCode = async (
	input: string,
	profileId: string
): Promise<CodeCheck> => {
	const code = normalizeCode(input);
	const row = code
		? await db.discountCode.findUnique({ where: { code } })
		: null;
	if (!row || !row.isActive) {
		return { ok: false, message: "That code isn't valid" };
	}
	if (row.oncePerCustomer) {
		const used = await db.order.count({
			where: { profileId, discountCode: row.code, refundedAt: null },
		});
		if (used > 0)
			return { ok: false, message: "You've already used this code" };
	}
	const { kind, value } = asProps(row);
	return { ok: true, code: row.code, rule: { kind, value } };
};

// --- the code sitting in a customer's cart ---

export const getCartDiscountCode = async (cartId: string) => {
	const cart = await db.cart.findUnique({
		where: { id: cartId },
		select: { discountCode: true },
	});
	return cart?.discountCode ?? null;
};

export const setCartDiscountCode = async (
	cartId: string,
	code: string | null
) => {
	await db.cart.updateMany({
		where: { id: cartId },
		data: { discountCode: code },
	});
};

export type CartDiscount = {
	// the code the customer applied, if any
	code: string | null;
	// what it does, only when it can be used right now
	rule: DiscountRule | null;
	// the reason the customer must fix it, when it can't be used any more
	problem: string | null;
};

// The state of the code in a signed-in customer's cart, checked against the
// codes as they are right now. Shared by the cart page and the checkout so they
// always agree.
export const getCartDiscount = async (
	cartId: string,
	userId: string
): Promise<CartDiscount> => {
	const code = cartId ? await getCartDiscountCode(cartId) : null;
	if (!code) return { code: null, rule: null, problem: null };

	const profile = await db.profile.findUnique({
		where: { userId },
		select: { id: true },
	});
	const check = profile
		? await checkDiscountCode(code, profile.id)
		: ({ ok: false, message: '' } as const);
	if (!check.ok) {
		return {
			code,
			rule: null,
			problem: `The code ${code} can no longer be used. Remove it to continue.`,
		};
	}
	return { code, rule: check.rule, problem: null };
};
