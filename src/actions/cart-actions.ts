'use server';

import z from 'zod';
import { revalidatePath } from 'next/cache';
import { addItemToCart, deleteCartItem } from '@/db/cart-db';

export const addToCart = async (previousState: object, formData: FormData) => {
	const cartId = formData.get('cartId') as string | null;
	const productId = formData.get('productId') as string | null;
	let quantity = formData.get('quantity') as string | number | null;
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// Create a schema for the form data
	const cartItemSchema = z.object({
		cartId: z.string().trim().length(25, { message: 'Invalid cartId' }),
		productId: z.string().length(25, { message: 'Invalid productId' }),
		quantity: z.string().min(1),
	});

	try {
		// Validate the form data
		cartItemSchema.parse({
			cartId,
			productId,
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

	// Check if the cartId is a string
	if (typeof cartId !== 'string') {
		response.errors.push('Invalid cartId');
		return response;
	}

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

	try {
		// Add the product to the cart
		await addItemToCart({
			cartId: cartId as string,
			productId: productId as string,
			quantity: quantity as number,
		});
	} catch (error) {
		console.error(error);
		response.errors.push('An error occurred');
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
	const cartId = formData.get('cartId') as string | null;
	const productId = formData.get('productId') as string | null;
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// Create a schema for the form data
	const cartItemSchema = z.object({
		cartId: z.string().trim().length(25, { message: 'Invalid cartId' }),
		productId: z.string().length(25, { message: 'Invalid productId' }),
	});

	try {
		// Validate the form data
		cartItemSchema.parse({
			cartId,
			productId,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			response.errors.push(error.errors[0].message);
		} else {
			response.errors.push('Unknown error occurred');
		}
		return response;
	}

	// Check if the cartId is a string
	if (typeof cartId !== 'string') {
		response.errors.push('Invalid cartId');
		return response;
	}

	// Check if the productId is a string
	if (typeof productId !== 'string') {
		response.errors.push('Invalid productId');
		return response;
	}

	try {
		// Remove the product from the cart
		await deleteCartItem(cartId as string, productId as string);
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
