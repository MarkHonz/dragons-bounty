'use server';

import { revalidatePath } from 'next/cache';

import { assertAdminOrThrow, verifyAuthSession } from '@/lib/auth';
import { logActivity } from '@/db/activity-db';
import { getCartIdByUserId } from '@/db/cart-db';
import { getProfileIdByUserId } from '@/db/user-db';
import {
	checkDiscountCode,
	createDiscountCode,
	deleteDiscountCode,
	getDiscountCodeById,
	getShippingRates,
	saveShippingRates,
	setCartDiscountCode,
	setDiscountCodeActive,
	updateDiscountCode,
} from '@/db/discount-db';
import { describeDiscount, DISCOUNT_KINDS, DiscountKind } from '@/lib/pricing';
import {
	formatCurrency,
	parseAmountToCents,
	parsePriceToCents,
} from '@/lib/formatters';

const money = (cents: number) => formatCurrency(cents / 100);

// "10% off, one use per customer" for the activity log
const describeCode = (fields: {
	kind: DiscountKind;
	value: number;
	oncePerCustomer: boolean;
	isActive: boolean;
}) =>
	[
		describeDiscount(fields, money),
		fields.oncePerCustomer ? 'one use per customer' : null,
		fields.isActive ? null : 'switched off',
	]
		.filter(Boolean)
		.join(', ');

type Response = { errors: string[]; success: boolean };

const newResponse = (): Response => ({ errors: [], success: false });

// --- the customer's own cart ---

// The cart these work on is the signed-in customer's own, found from the
// session. A cart id sent by the browser is never trusted.
const sessionCustomer = async () => {
	const { user } = await verifyAuthSession();
	if (!user) return null;
	const [cartId, profileId] = await Promise.all([
		getCartIdByUserId(user.id) as Promise<string | null>,
		getProfileIdByUserId(user.id),
	]);
	if (!cartId || !profileId) return null;
	return { cartId, profileId };
};

export const applyDiscountCode = async (
	previousState: object,
	formData: FormData
) => {
	const response = newResponse();
	const customer = await sessionCustomer();
	if (!customer) {
		response.errors.push('Please sign in to use a discount code');
		return response;
	}

	const input = formData.get('code');
	if (typeof input !== 'string' || input.trim() === '' || input.length > 50) {
		response.errors.push('Enter a discount code');
		return response;
	}

	const check = await checkDiscountCode(input, customer.profileId);
	if (!check.ok) {
		response.errors.push(check.message);
		return response;
	}

	await setCartDiscountCode(customer.cartId, check.code);
	revalidatePath('/cart');
	response.success = true;
	return response;
};

export const removeDiscountCode = async () => {
	const response = newResponse();
	const customer = await sessionCustomer();
	if (!customer) {
		response.errors.push('Please sign in to use your cart');
		return response;
	}
	await setCartDiscountCode(customer.cartId, null);
	revalidatePath('/cart');
	response.success = true;
	return response;
};

// --- admin: discount codes ---

// the biggest amount the admin can type ($100,000), far below what the database
// can hold, so no total can overflow
const MAX_AMOUNT_IN_CENTS = 10_000_000;

const CODE_PATTERN = /^[A-Za-z0-9-]{3,30}$/;

// Validates the fields shared by "create" and "edit".
const parseCodeFields = (formData: FormData, response: Response) => {
	const kind = formData.get('kind')?.toString() ?? '';
	const valueText = formData.get('value')?.toString() ?? '';
	const oncePerCustomer = formData.get('oncePerCustomer') === 'on';
	const isActive = formData.get('isActive') === 'on';

	if (!DISCOUNT_KINDS.some((allowed) => allowed === kind)) {
		response.errors.push('Choose what the code does');
		return null;
	}

	let value = 0;
	if (kind === 'PERCENT') {
		const percent = /^\d{1,3}$/.test(valueText.trim())
			? Number(valueText.trim())
			: NaN;
		if (!(percent >= 1 && percent <= 100)) {
			response.errors.push('Percent off must be a whole number from 1 to 100');
			return null;
		}
		value = percent;
	} else if (kind === 'FIXED') {
		const cents = parsePriceToCents(valueText);
		if (cents === null || cents > MAX_AMOUNT_IN_CENTS) {
			response.errors.push(
				'Amount off must be a dollar amount above $0, like 5 or 5.00'
			);
			return null;
		}
		value = cents;
	}

	return { kind: kind as DiscountKind, value, oncePerCustomer, isActive };
};

const revalidateDiscounts = () => {
	revalidatePath('/admin/discounts');
	revalidatePath('/cart');
};

export const createDiscountCodeAction = async (
	previousState: object,
	formData: FormData
) => {
	const { user: admin } = await assertAdminOrThrow();
	const response = newResponse();

	const code = formData.get('code')?.toString().trim() ?? '';
	if (!CODE_PATTERN.test(code)) {
		response.errors.push(
			'The code must be 3 to 30 letters, numbers or dashes, with no spaces'
		);
		return response;
	}
	const fields = parseCodeFields(formData, response);
	if (!fields) return response;

	const created = await createDiscountCode(code, fields);
	if (!created) {
		response.errors.push('A code with that name already exists');
		return response;
	}
	await logActivity(
		admin.id,
		'PRICING',
		`Created the discount code ${created.code} (${describeCode(created)})`
	);

	revalidateDiscounts();
	response.success = true;
	return response;
};

export const updateDiscountCodeAction = async (
	previousState: object,
	formData: FormData
) => {
	const { user: admin } = await assertAdminOrThrow();
	const response = newResponse();

	const id = formData.get('id')?.toString() ?? '';
	const fields = parseCodeFields(formData, response);
	if (!fields) return response;

	// the code itself is never changed: past orders refer to it by name
	const before = id ? await getDiscountCodeById(id) : null;
	const updated = id ? await updateDiscountCode(id, fields) : false;
	if (!updated) {
		response.errors.push('That code no longer exists');
		return response;
	}
	// saving without changing anything writes nothing
	if (before && describeCode(before) !== describeCode(fields)) {
		await logActivity(
			admin.id,
			'PRICING',
			`Changed the discount code ${before.code} from ${describeCode(before)} to ${describeCode(fields)}`
		);
	}

	revalidateDiscounts();
	response.success = true;
	return response;
};

export const toggleDiscountCodeActive = async (
	id: string,
	isActive: boolean
) => {
	const { user: admin } = await assertAdminOrThrow();
	const response = newResponse();

	if (typeof id !== 'string' || typeof isActive !== 'boolean') {
		response.errors.push('Invalid request');
		return response;
	}
	const code = await getDiscountCodeById(id);
	if (!(await setDiscountCodeActive(id, isActive))) {
		response.errors.push('That code no longer exists');
		return response;
	}
	if (code && code.isActive !== isActive) {
		await logActivity(
			admin.id,
			'PRICING',
			`Switched ${isActive ? 'on' : 'off'} the discount code ${code.code}`
		);
	}

	revalidateDiscounts();
	response.success = true;
	return response;
};

export const deleteDiscountCodeAction = async (id: string) => {
	const { user: admin } = await assertAdminOrThrow();
	const response = newResponse();

	const code = typeof id === 'string' ? await getDiscountCodeById(id) : null;
	if (typeof id !== 'string' || !(await deleteDiscountCode(id))) {
		response.errors.push('That code no longer exists');
		return response;
	}
	await logActivity(
		admin.id,
		'PRICING',
		`Deleted the discount code ${code?.code ?? id}`
	);

	revalidateDiscounts();
	response.success = true;
	return response;
};

// --- admin: shipping rates ---

export const saveShippingRatesAction = async (
	previousState: object,
	formData: FormData
) => {
	const { user: admin } = await assertAdminOrThrow();
	const response = newResponse();

	const flatRateInCents = parseAmountToCents(
		formData.get('flatRate')?.toString() ?? ''
	);
	if (flatRateInCents === null || flatRateInCents > MAX_AMOUNT_IN_CENTS) {
		response.errors.push(
			'The shipping rate must be a dollar amount, like 9.99 (or 0 for free shipping)'
		);
		return response;
	}

	// blank = shipping is never free by order total
	const freeOverText = formData.get('freeOver')?.toString().trim() ?? '';
	let freeOverInCents: number | null = null;
	if (freeOverText !== '') {
		freeOverInCents = parsePriceToCents(freeOverText);
		if (freeOverInCents === null || freeOverInCents > MAX_AMOUNT_IN_CENTS) {
			response.errors.push(
				'Free shipping over must be a dollar amount above $0, or blank for never'
			);
			return response;
		}
	}

	const before = await getShippingRates();
	await saveShippingRates({ flatRateInCents, freeOverInCents });

	const describeRates = (flat: number, freeOver: number | null) =>
		`${money(flat)} flat, ${freeOver === null ? 'never free' : `free over ${money(freeOver)}`}`;
	if (
		before.flatRateInCents !== flatRateInCents ||
		before.freeOverInCents !== freeOverInCents
	) {
		await logActivity(
			admin.id,
			'PRICING',
			`Changed shipping from ${describeRates(before.flatRateInCents, before.freeOverInCents)} to ${describeRates(flatRateInCents, freeOverInCents)}`
		);
	}

	revalidatePath('/admin/shipping');
	revalidatePath('/cart');
	revalidatePath('/checkout');
	response.success = true;
	return response;
};
