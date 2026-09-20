'use server';

import z from 'zod';
import { revalidatePath } from 'next/cache';
import {
	addItemToCart,
	deleteCartItem,
	updateCartItemQuantity,
} from '@/db/cart-db';
import { getPurchaseInfo } from '@/db/product-db';
import { getCartIdForSession } from '@/lib/auth';

// The cart these actions work on is always the signed-in customer's own, worked
// out from the session. A cart id sent by the browser is never trusted. This is
// null when nobody is signed in: guest carts live in the browser, so a guest
// has no reason to call these actions.
const sessionCartId = async () => {
	const cartId = await getCartIdForSession();
	return cartId === 'guest' ? null : cartId;
};

const SIGN_IN_MESSAGE = 'Please sign in to use your cart';

// The option a cart request names: "" for a product without options, otherwise
// the option's id. Anything else is not a valid id and is refused by the schema.
const optionIdField = z
	.string()
	.refine((value) => value === '' || value.length === 25, {
		message: 'Invalid option',
	});

// A message for the customer when this quantity can't be bought, or null when
// it can: the product must still be for sale, a product sold in options needs
// one chosen, and there must be enough in stock. A product with no stock number
// is not tracked and is never refused for stock.
const stockProblem = async (
	productId: string,
	variantId: string,
	quantity: number
) => {
	if (quantity < 1) return 'Quantity must be at least 1';
	const info = await getPurchaseInfo(productId, variantId);
	if (info?.hasOptions && variantId === '') return 'Please choose an option';
	if (!info || !info.buyable) return 'Sorry, this item is no longer available';
	const inStock = info.quantity;
	if (inStock === null) return null;
	if (inStock <= 0) return 'Sorry, this item is sold out';
	if (quantity > inStock) return `Only ${inStock} in stock`;
	return null;
};

export const addToCart = async (previousState: object, formData: FormData) => {
	const cartId = await sessionCartId();
	const productId = formData.get('productId') as string | null;
	const variantId = (formData.get('variantId') as string | null) ?? '';
	let quantity = formData.get('quantity') as string | number | null;
	const response: {
		errors: string[];
		success: boolean;
		alreadyInCart?: boolean;
	} = {
		errors: [],
		success: false,
	};

	if (!cartId) {
		response.errors.push(SIGN_IN_MESSAGE);
		return response;
	}

	// Create a schema for the form data
	const cartItemSchema = z.object({
		productId: z.string().length(25, { message: 'Invalid productId' }),
		variantId: optionIdField,
		quantity: z.string().min(1),
	});

	try {
		// Validate the form data
		cartItemSchema.parse({
			productId,
			variantId,
			quantity,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			response.errors.push(error.errors[0].message);
		} else {
			response.errors.push('Unknown error occurred');
		}
		return response;
	}

	// Convert the quantity to a number
	quantity = parseInt(quantity as string, 10);

	// Check if the productId is a string
	if (typeof productId !== 'string') {
		response.errors.push('Invalid productId');
		return response;
	}

	// Check if the quantity is a number
	if (typeof quantity !== 'number') {
		response.errors.push('Invalid quantity');
		return response;
	}

	// never put more in a cart than is in stock
	const tooMany = await stockProblem(productId, variantId, quantity);
	if (tooMany) {
		response.errors.push(tooMany);
		return response;
	}

	// Add the product to the cart. addItemToCart returns errors rather than
	// throwing them; P2002 means this product is already in the cart.
	const added = await addItemToCart({
		cartId: cartId as string,
		productId: productId as string,
		variantId,
		quantity: quantity as number,
	});
	if (added instanceof Error) {
		if ((added as { code?: string }).code === 'P2002') {
			response.alreadyInCart = true;
			response.errors.push('This item is already in your cart');
		} else {
			response.errors.push('An error occurred');
		}
		return response;
	}

	revalidatePath(`/products`, 'layout');
	response.success = true;
	return response;
};

// remove the item from the cart
export const removeFromCart = async (
	previousState: object,
	formData: FormData
) => {
	const cartId = await sessionCartId();
	const productId = formData.get('productId') as string | null;
	const variantId = (formData.get('variantId') as string | null) ?? '';
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	if (!cartId) {
		response.errors.push(SIGN_IN_MESSAGE);
		return response;
	}

	// Create a schema for the form data
	const cartItemSchema = z.object({
		productId: z.string().length(25, { message: 'Invalid productId' }),
		variantId: optionIdField,
	});

	try {
		// Validate the form data
		cartItemSchema.parse({
			productId,
			variantId,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			response.errors.push(error.errors[0].message);
		} else {
			response.errors.push('Unknown error occurred');
		}
		return response;
	}

	// Check if the productId is a string
	if (typeof productId !== 'string') {
		response.errors.push('Invalid productId');
		return response;
	}

	try {
		// Remove the product from the cart
		await deleteCartItem(cartId as string, productId as string, variantId);
	} catch (error) {
		console.error(error);
		response.errors.push('An error occurred');
		return response;
	}

	revalidatePath(`/products`, 'layout');
	revalidatePath(`/cart`, 'layout');
	response.success = true;
	return response;
};

// update the quantity of the cart item
export const updateCartItem = async (
	previousState: object,
	formData: FormData
) => {
	const cartId = await sessionCartId();
	const productId = formData.get('productId') as string | null;
	const variantId = (formData.get('variantId') as string | null) ?? '';
	let quantity = formData.get('quantity') as string | number | null;
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	if (!cartId) {
		response.errors.push(SIGN_IN_MESSAGE);
		return response;
	}

	// Create a schema for the form data
	const cartItemSchema = z.object({
		productId: z.string().length(25, { message: 'Invalid productId' }),
		variantId: optionIdField,
		quantity: z.string().min(1),
	});

	try {
		// Validate the form data
		cartItemSchema.parse({
			productId,
			variantId,
			quantity,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			response.errors.push(error.errors[0].message);
		} else {
			response.errors.push('Unknown error occurred');
		}
		return response;
	}

	// Convert the quantity to a number
	quantity = parseInt(quantity as string, 10);

	// Check if the productId is a string
	if (typeof productId !== 'string') {
		response.errors.push('Invalid productId');
		return response;
	}

	// Check if the quantity is a number
	if (typeof quantity !== 'number') {
		response.errors.push('Invalid quantity');
		return response;
	}

	// never put more in a cart than is in stock
	const tooMany = await stockProblem(productId, variantId, quantity);
	if (tooMany) {
		response.errors.push(tooMany);
		return response;
	}

	try {
		// Update the cart item quantity
		await updateCartItemQuantity({
			cartId: cartId as string,
			productId: productId as string,
			variantId,
			quantity: quantity as number,
		});
	} catch (error) {
		console.error(error);
		response.errors.push('An error occurred');
		return response;
	}

	revalidatePath(`/products`, 'layout');
	revalidatePath(`/cart`, 'layout');
	response.success = true;
	return response;
};
