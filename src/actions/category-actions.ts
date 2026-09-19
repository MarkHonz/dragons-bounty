'use server';

import z from 'zod';
import { revalidatePath } from 'next/cache';

import { assertAdminOrThrow } from '@/lib/auth';
import {
	createCategory,
	deleteCategory,
	updateCategory,
	updateCategoryActive,
} from '@/db/category-db';

export const categorySubmit = async (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	previousState: any,
	formData: FormData
) => {
	await assertAdminOrThrow();

	const name = formData.get('name') as string | null;
	const description = formData.get('description') as string | null;
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// Create a schema for the form data
	const schema = z.object({
		name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
		description: z
			.string()
			.min(2, { message: 'Description must be at least 2 characters' })
			.optional()
			.or(z.literal('')),
	});

	try {
		// Validate the form data
		schema.parse({
			name,
			description: description ?? undefined,
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
	await createCategory({ name, description: description || undefined });

	// Revalidate the category page
	revalidatePath(`/category`, 'layout');

	response.success = true;
	return response;
};

export const categoryDelete = async (id: string) => {
	await assertAdminOrThrow();

	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// Delete the category; deleteCategory returns errors rather than throwing them
	const deleted = await deleteCategory(id);
	if (deleted instanceof Error) {
		// P2003: products still belong to this category
		response.errors.push(
			(deleted as { code?: string }).code === 'P2003'
				? "This category still has products, so it can't be deleted. Move or delete them first."
				: 'Failed to delete the category.'
		);
		return response;
	}

	revalidatePath(`/admin/category`);
	revalidatePath(`/category`, 'layout');
	response.success = true;
	return response;
};

export const toggleCategoryActive = async (id: string, isActive: boolean) => {
	await assertAdminOrThrow();

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

export const categoryUpdate = async (
	id: string,
	name: string,
	description?: string
) => {
	await assertAdminOrThrow();

	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// Update the category
	await updateCategory(id, { name, description });

	// Revalidate the category page
	revalidatePath(`/category`, 'layout');
	response.success = true;
	return response;
};
