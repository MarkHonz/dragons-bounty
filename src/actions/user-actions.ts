'use server';

import z from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createUser, deleteUser, findUserByEmail } from '@/lib/user-db';
import { hashUserPassword, verifyPassword } from '@/lib/hash';
import { createAuthSession, destroyAuthSession } from '@/lib/auth';

export const userSubmit = async (previousState: never, formData: FormData) => {
	// console.log('previousState:', previousState);
	const name = formData.get('name') as string | null;
	const password = formData.get('password') as string | null;
	const email = formData.get('email') as string | null;
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// Create a schema for the form data
	const schema = z.object({
		name: z.string().min(2),
		password: z.string().min(6),
		email: z.string().email(),
	});

	try {
		// Validate the form data
		schema.parse({
			name,
			password,
			email,
		});
	} catch (error) {
		const { errors } = error as z.ZodError;
		// console.log('error:', error.errors[0].message);
		// console.log('errors:', errors);
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

	// Create the user
	const user = (await createUser({
		name,
		email,
		password: hashedPassword,
	})) as { id: string }; // Add type assertion here
	await createAuthSession(user.id); // Create a session for the user
	// redirect('/'); // Redirect to the home page
	response.success = true; // Set the success flag to true
	console.log('SUCCESS!');
	revalidatePath('/', 'layout'); // Revalidate the layout path
	return response; // Return the response object
};

export const userLogin = async (previousState: never, formData: FormData) => {
	const email = formData.get('email') as string | null;
	const password = formData.get('password') as string | null;
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// Create a schema for the form data
	const schema = z.object({
		email: z.string().email(),
		password: z.string().min(6),
	});

	try {
		// Validate the form data
		schema.parse({
			email,
			password,
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
