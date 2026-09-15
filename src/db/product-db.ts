import db from '@/db/db';

export type ProductProps = {
	id: string;
	name: string;
	priceInCents: number;
	description: string;
	imagePath?: string;
	categoryId: string;
	isAvailable: boolean;
	createdAt: Date;
	updatedAt: Date;
	quantity: number;
	category: {
		id: string;
		name: string;
		createdAt: Date;
		updatedAt: Date;
	};
};

export type CreateProductProps = {
	name: string;
	priceInCents: number;
	description: string;
	imagePath?: string;
	categoryId: string;
	quantity?: number;
};

export type UpdateProductProps = {
	id: string;
	name: string;
	priceInCents: number;
	description: string;
	// imagePath?: string;
	categoryId: string;
};

export const createProduct = async ({
	name,
	priceInCents,
	description,
	imagePath,
	categoryId,
	quantity,
}: CreateProductProps) => {
	try {
		return await db.product.create({
			data: {
				name,
				priceInCents,
				description,
				imagePath,
				categoryId,
				quantity,
			},
		});
	} catch (error) {
		return error;
	}
};

export const getProducts = async () => {
	try {
		return await db.product.findMany({
			include: {
				category: true,
			},
		});
	} catch (error) {
		return error;
	}
};

export const getProductById = async (id: string) => {
	try {
		return await db.product.findUnique({
			where: {
				id,
			},
			include: {
				category: true,
			},
		});
	} catch (error) {
		return error;
	}
};

export const deleteProduct = async (id: string) => {
	try {
		return await db.product.delete({
			where: {
				id,
			},
		});
	} catch (error) {
		return error;
	}
};

export const toggleProductAvailable = async (id: string, isActive: boolean) => {
	try {
		return await db.product.update({
			where: {
				id,
			},
			data: {
				isAvailable: isActive,
			},
		});
	} catch (error) {
		return error;
	}
};

export const updateProduct = async (id: string, data: CreateProductProps) => {
	try {
		return await db.product.update({
			where: {
				id,
			},
			data,
		});
	} catch (error) {
		console.error('Failed to update the product', error);
		return error;
	}
};

export const getProductsByCategoryId = async (categoryId: string) => {
	try {
		return await db.product.findMany({
			where: {
				categoryId,
			},
			include: {
				category: true,
			},
			// fetch newest six products
			take: 6,
			orderBy: {
				createdAt: 'desc',
			},
		});
	} catch (error) {
		return error;
	}
};

export const getProductDetails = async (productIdArray: string[]) => {
	try {
		return await db.product.findMany({
			where: {
				id: {
					in: productIdArray,
				},
			},
			include: {
				category: true,
			},
		});
	} catch (error) {
		return error;
	}
};

export const getAvailableProducts = async () => {
	try {
		return await db.product.findMany({
			where: {
				isAvailable: true,
			},
			include: {
				category: true,
			},
		});
	} catch (error) {
		return error;
	}
};

// get available products by categoryId
export const getAvailableProductsByCategoryId = async (categoryId: string) =>
	await db.product.findMany({
		where: {
			categoryId,
			isAvailable: true,
		},
		include: {
			category: true,
		},
	});

// get product name by id
export const getProductNameById = async (id: string) => {
	try {
		const product = await db.product.findUnique({
			where: {
				id,
			},
		});
		return product ? product.name : null;
	} catch (error) {
		return error;
	}
};

// get product price by id
export const getProductPriceById = async (id: string) => {
	try {
		const product = await db.product.findUnique({
			where: {
				id,
			},
		});
		return product ? product.priceInCents : null;
	} catch (error) {
		return error;
	}
};

// get product quantity by id
export const getProductQuantityById = async (id: string) => {
	try {
		const product = await db.product.findUnique({
			where: {
				id,
			},
		});
		return product ? product.quantity : null;
	} catch (error) {
		return error;
	}
};

// subtract product quantity from the product by id
export const subtractProductQuantityById = async (
	id: string,
	quantity: number
) => {
	try {
		const product = await db.product.findUnique({
			where: {
				id,
			},
		});
		if (product) {
			await db.product.update({
				where: {
					id,
				},
				data: {
					quantity: (product.quantity ?? 1) - quantity,
				},
			});
		}
	} catch (error) {
		return error;
	}
};
