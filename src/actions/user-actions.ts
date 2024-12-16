'use server';

import z from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
	addUserAddress,
	createUser,
	deleteUser,
	findUserByEmail,
} from '@/db/user-db';
import { hashUserPassword, verifyPassword } from '@/lib/hash';
import { createAuthSession, destroyAuthSession } from '@/lib/auth';
import { addItemToCart, getCartById, getCartIdByUserId } from '@/db/cart-db';
import { getProductById, ProductProps } from '@/db/product-db';

export const userSubmit = async (previousState: object, formData: FormData) => {
	const name = formData.get('name') as string | null;
	const password = formData.get('password') as string | null;
	const email = formData.get('email') as string | null;
	interface CartItem {
		productId: string;
		quantity: number;
	}

	const cartItems = formData.get('cartItems') as CartItem[] | null;
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// Create a schema for the form data
	const schema = z.object({
		name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
		password: z
			.string()
			.min(6, { message: 'Password must be at least 6 characters' }),
		email: z.string().email(),
		cartItems: z.string().optional(),
	});

	try {
		// Validate the form data
		schema.parse({
			name,
			password,
			email,
			cartItems,
		});
	} catch (error) {
		const { errors } = error as z.ZodError;
		// console.log('error:', error.errors[0].message);
		console.log('errors:', errors);
		errors.map((error) => {
			response.errors.push(error.message);
		});
		return response;
	}

	// Check if the name, email, and password are strings
	if (
		typeof name !== 'string' ||
		typeof email !== 'string' ||
		typeof password !== 'string'
	) {
		response.errors.push('Invalid form data');
		return response;
	}
	const hashedPassword = hashUserPassword(password);

	const parsedCartItems = cartItems
		? JSON.parse(cartItems as unknown as string)
		: null;

	// Create the user
	const user = (await createUser({
		name,
		email,
		password: hashedPassword,
	})) as { id: string }; // Add type assertion here
	await createAuthSession(user.id); // Create a session for the user

	console.log('cartItems:', cartItems);

	// add the cartItems to the cart in the database table cart_product
	if (parsedCartItems !== null && parsedCartItems.length > 0) {
		const cartId: string = (await getCartIdByUserId(user.id)) as string;
		// json parse the cartItems and add each item to the cart

		parsedCartItems.map(async (item: CartItem) => {
			console.log('item:', item);
			const productId = item['productId'] as string;
			const quantity = item['quantity'] as number;
			await addItemToCart({
				cartId,
				productId,
				quantity,
			});
		});
	}

	// redirect('/'); // Redirect to the home page
	response.success = true; // Set the success flag to true
	console.log('SUCCESS!');
	revalidatePath('/', 'layout'); // Revalidate the layout path
	return response; // Return the response object
};

type CartItem = {
	productId?: string;
	quantity?: number;
	name?: string;
	price?: number;
};

export const userLogin = async (previousState: object, formData: FormData) => {
	const email = formData.get('email') as string | null;
	const password = formData.get('password') as string | null;
	const sentCartItems = formData.get('cartItems') as CartItem[] | null;
	const response: {
		errors: string[];
		success: boolean;
		cartItems: CartItem[];
	} = {
		errors: [],
		success: false,
		cartItems: [],
	};

	// Create a schema for the form data
	const schema = z.object({
		email: z.string().email(),
		password: z.string().min(6),
		sentCartItems: z.string().optional(),
	});

	try {
		// Validate the form data
		schema.parse({
			email,
			password,
			sentCartItems,
		});
	} catch (error) {
		const { errors } = error as z.ZodError;
		errors.map((error) => {
			response.errors.push(error.message);
		});
		return response;
	}

	if (email == null) {
		response.errors.push('Email is required');
		return response;
	}
	const user = await findUserByEmail(email);
	if (user == null) {
		response.errors.push('User not found');
		return response;
	}

	if (password === null) {
		response.errors.push('Password is required');
		return response;
	}
	const isValid = verifyPassword(user.password, password);
	if (isValid == false) {
		response.errors.push('Invalid password');
		return response;
	}

	await createAuthSession(user.id); // Create a session for the user

	const localCartItems = JSON.parse(
		sentCartItems as unknown as string
	) as CartItem[];

	const cartId: string = (await getCartIdByUserId(user.id)) as string;

	//type for the cartItems in the database
	type DatabaseCartItem = {
		product_id: string;
		quantity: number;
		cart_id: string;
	};

	// get the cartItems from the database
	const databaseCartItems = (await getCartById(cartId)) as DatabaseCartItem[];

	console.log('localCartItems:', localCartItems);
	console.log('databaseCartItems:', databaseCartItems);

	// map over the localCartItems and add them to the databaseCartItems if they don't already exist
	localCartItems.map(async (localCartItem) => {
		if (localCartItem.productId) {
			const itemExists = databaseCartItems.find(
				(databaseCartItem) =>
					databaseCartItem.product_id === localCartItem.productId
			);
			if (itemExists === undefined) {
				await addItemToCart({
					cartId: cartId,
					productId: localCartItem.productId,
					quantity: localCartItem.quantity ?? 1,
				});
			}
		}
	});

	// map over the databaseCartItems and add items to the response object if they don't already exist
	databaseCartItems.map(async (databaseCartItem) => {
		const itemExists = localCartItems.find(
			(localCartItem) => localCartItem.productId === databaseCartItem.product_id
		);
		// make sure the item exists and has a productId
		if (itemExists === undefined) {
			// get product info from the database and add it to the response object
			if (databaseCartItem.product_id) {
				const product = (await getProductById(
					databaseCartItem.product_id
				)) as ProductProps;
				response.cartItems.push({
					productId: databaseCartItem.product_id,
					quantity: databaseCartItem.quantity,
					name: product.name,
					price: product.priceInCents,
				});
			}
		}
	});

	// redirect('/'); // Redirect to the home page
	response.success = true; // Set the success flag to true
	return response; // Return the response object
};

export const userDelete = async (id: string) => {
	try {
		await deleteUser(id);
		console.log(`deleted ${id}`);
		revalidatePath('/', 'layout');
	} catch (error) {
		console.log('error:', error);
	}
};

export const userAuth = (
	formMode: string,
	previousState: never,
	formData: FormData
) => {
	if (formMode === 'login') return userLogin(previousState, formData);
	return userSubmit(previousState, formData);
};

export const userLogout = async () => {
	await destroyAuthSession();
	redirect('/');
};

// add address to profile
export const userAddAddress = async (
	previousState: object,
	formData: FormData
) => {
	const address1 = formData.get('address1') as string | null;
	const address2 = formData.get('address2') as string | null;
	const city = formData.get('city') as string | null;
	const state = formData.get('state') as string | null;
	const zip = formData.get('zip') as string | null;
	const user = formData.get('user') as string | null;
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// Create a schema for the form data
	const schema = z.object({
		address1: z.string().min(2, { message: 'Address is required' }),
		address2: z.string().optional(),
		city: z.string().min(2, { message: 'City is required' }),
		state: z.string().min(2, { message: 'State is required' }),
		zip: z.string().min(5, { message: 'Zip is required' }),
		user: z.string(),
	});

	try {
		// Validate the form data
		schema.parse({
			address1,
			address2,
			city,
			state,
			zip,
			user,
		});
	} catch (error) {
		const { errors } = error as z.ZodError;
		errors.map((error) => {
			response.errors.push(error.message);
		});
		return response;
	}

	// Check if the street, city, state, and zip are strings
	if (
		typeof address1 !== 'string' ||
		typeof address2 !== 'string' ||
		typeof city !== 'string' ||
		typeof state !== 'string' ||
		typeof zip !== 'string' ||
		typeof user !== 'string'
	) {
		response.errors.push('Invalid form data');
		return response;
	}

	// add the address to the user profile
	try {
		await addUserAddress(user, address1, address2, city, state, zip);
		response.success = true;
		revalidatePath('/', 'layout');
		return response;
	} catch {
		response.errors.push('Error adding address');
		return response;
	}
};
