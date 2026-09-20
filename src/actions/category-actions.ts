'use server';

import z from 'zod';
import { revalidatePath } from 'next/cache';

import { assertAdminOrThrow } from '@/lib/auth';
import { logActivity } from '@/db/activity-db';
import {
	createCategory,
	deleteCategory,
	findCategoryById,
	moveCategory,
	updateCategory,
	updateCategoryActive,
} from '@/db/category-db';

export const categorySubmit = async (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	previousState: any,
	formData: FormData
) => {
	const { user: admin } = await assertAdminOrThrow();

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
	const created = await createCategory({
		name,
		description: description || undefined,
	});
	if (!(created instanceof Error)) {
		await logActivity(admin.id, 'CATEGORY', `Created the category "${name}"`);
	}

	// Revalidate the category page
	revalidatePath(`/category`, 'layout');

	response.success = true;
	return response;
};

export const categoryDelete = async (id: string) => {
	const { user: admin } = await assertAdminOrThrow();

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

	await logActivity(
		admin.id,
		'CATEGORY',
		`Deleted the category "${(deleted as { name: string }).name}"`
	);

	revalidatePath(`/admin/category`);
	revalidatePath(`/category`, 'layout');
	response.success = true;
	return response;
};

export const toggleCategoryActive = async (id: string, isActive: boolean) => {
	const { user: admin } = await assertAdminOrThrow();

	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// Update the category
	const updated = await updateCategoryActive(id, isActive);
	if (!(updated instanceof Error)) {
		await logActivity(
			admin.id,
			'CATEGORY',
			`${isActive ? 'Activated' : 'Deactivated'} the category "${(updated as { name: string }).name}"`
		);
	}

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
	const { user: admin } = await assertAdminOrThrow();

	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// Update the category
	const updated = await updateCategory(id, { name, description });
	if (!(updated instanceof Error)) {
		await logActivity(admin.id, 'CATEGORY', `Edited the category "${name}"`);
	}

	// Revalidate the category page
	revalidatePath(`/category`, 'layout');
	response.success = true;
	return response;
};

// move a category up or down the storefront order
export const moveCategoryAction = async (
	id: string,
	direction: 'up' | 'down'
) => {
	const { user: admin } = await assertAdminOrThrow();

	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	if (direction !== 'up' && direction !== 'down') {
		response.errors.push('Invalid direction');
		return response;
	}

	try {
		const moved = await moveCategory(id, direction);
		if (!moved) {
			response.errors.push("This category can't move any further.");
			return response;
		}
	} catch (error) {
		console.error('Failed to move category', error);
		response.errors.push('Failed to move the category.');
		return response;
	}

	const moved = await findCategoryById(id);
	await logActivity(
		admin.id,
		'CATEGORY',
		`Moved the category "${moved?.name ?? id}" ${direction}`
	);

	// the header, the homepage and the category pages all list categories in this order
	revalidatePath('/', 'layout');
	revalidatePath('/admin/category');

	response.success = true;
	return response;
};
