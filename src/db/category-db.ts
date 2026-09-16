import db from './db';

export type CategoryProps = {
	id: string;
	name: string;
	description: string | null;
	isActive: boolean;
};

export type CreateCategoryProps = {
	name: string;
	description?: string;
};

export const createCategory = async ({ name, description }: CreateCategoryProps) => {
	try {
		return await db.category.create({
			data: {
				name,
				description,
			},
		});
	} catch (error) {
		return error;
	}
};

export const deleteCategory = async (id: string) => {
	try {
		return await db.category.delete({
			where: { id: id },
		});
	} catch (error) {
		return error;
	}
};

export const findCategoryByName = async (name: string) => {
	return await db.category.findFirst({
		where: { name: name },
	});
};

export const getCategories = async () => {
	return await db.category.findMany();
};

export const findCategoryById = async (id: string) => {
	return await db.category.findUnique({
		where: { id: id },
	});
};

export const updateCategoryActive = async (id: string, isActive: boolean) => {
	try {
		return await db.category.update({
			where: { id: id },
			data: {
				isActive: isActive,
			},
		});
	} catch (error) {
		return error;
	}
};

export const updateCategory = async (
	id: string,
	{ name, description }: CreateCategoryProps
) => {
	try {
		return await db.category.update({
			where: { id: id },
			data: {
				name,
				description,
			},
		});
	} catch (error) {
		return error;
	}
};

export const findActiveCategories = async () => {
	return await db.category.findMany({
		where: { isActive: true },
	});
};
