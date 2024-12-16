'use server';

import z from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
	createCategory,
	deleteCategory,
	updateCategoryActive,
	updateCategoryName,
} from '@/db/category-db';

export const categorySubmit = async (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	previousState: any,
	formData: FormData
) => {
	const name = formData.get('name') as string | null;
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// Create a schema for the form data
	const schema = z.object({
		name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
	});

	try {
		// Validate the form data
		schema.parse({
			name,
		});
	} catch (error) {
		const { errors } = error as z.ZodError;
		errors.map((error) => {
			response.errors.push(error.message);
		});
		return response;
	}

	// Check if the name is a string
	if (typeof name !== 'string') {
		response.errors.push('Invalid form data');
		return response;
	}

	// Create the category
	await createCategory(name);

	// Revalidate the category page
	revalidatePath(`/category`, 'layout');

	response.success = true;
	return response;
};

export const categoryDelete = async (id: string) => {
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// Delete the category
	(await deleteCategory(id)) as { id: string };

	// Redirect to the category page
	redirect(`/admin/category`);

	response.success = true;
	return response;
};

export const toggleCategoryActive = async (id: string, isActive: boolean) => {
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// Update the category
	await updateCategoryActive(id, isActive);

	// Revalidate the category page
	revalidatePath(`/category`);

	response.success = true;
	return response;
};

export const categoryUpdate = async (id: string, name: string) => {
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// Update the category
	await updateCategoryName(id, name);

	// Revalidate the category page
	revalidatePath(`/category`, 'layout');
	response.success = true;
	return response;
};
