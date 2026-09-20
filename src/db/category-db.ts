import db from './db';

export type CategoryProps = {
	id: string;
	name: string;
	description: string | null;
	isActive: boolean;
	sortOrder: number;
};

// The storefront order: the position the admin chose, then oldest first so
// ties are always broken the same way.
const categoryOrder = [
	{ sortOrder: 'asc' as const },
	{ createdAt: 'asc' as const },
	{ id: 'asc' as const },
];

export type CreateCategoryProps = {
	name: string;
	description?: string;
};

export const createCategory = async ({ name, description }: CreateCategoryProps) => {
	try {
		// a new category goes last
		const last = await db.category.aggregate({ _max: { sortOrder: true } });
		return await db.category.create({
			data: {
				name,
				description,
				sortOrder: (last._max.sortOrder ?? -1) + 1,
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
	return await db.category.findMany({ orderBy: categoryOrder });
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
		orderBy: categoryOrder,
	});
};

// Move a category one place up or down among ALL categories (inactive ones keep
// their place too). Every category is re-numbered 0, 1, 2... each time, so gaps
// left by deletes and duplicate positions can never build up. Resolves to false
// when it can't move (already first or last, or not found). Throws on a
// database error so the caller can report it.
export const moveCategory = async (id: string, direction: 'up' | 'down') => {
	return db.$transaction(async (tx) => {
		const all = await tx.category.findMany({
			orderBy: categoryOrder,
			select: { id: true, sortOrder: true },
		});
		const index = all.findIndex((category) => category.id === id);
		const target = direction === 'up' ? index - 1 : index + 1;
		if (index === -1 || target < 0 || target >= all.length) return false;

		[all[index], all[target]] = [all[target], all[index]];
		for (let position = 0; position < all.length; position++) {
			if (all[position].sortOrder !== position) {
				await tx.category.update({
					where: { id: all[position].id },
					data: { sortOrder: position },
				});
			}
		}
		return true;
	});
};
