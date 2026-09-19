import db from '@/db/db';

export type ProductImageProps = {
	id: string;
	path: string;
	position: number;
};

const orderedImages = { orderBy: { position: 'asc' as const } };

export type ProductProps = {
	id: string;
	name: string;
	priceInCents: number;
	description: string;
	images: ProductImageProps[];
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
	_count?: { Orders_Products: number };
};

export type CreateProductProps = {
	name: string;
	priceInCents: number;
	description: string;
	imagePaths: string[];
	categoryId: string;
	quantity?: number;
};

export type UpdateProductFields = {
	name: string;
	priceInCents: number;
	description: string;
	categoryId: string;
	quantity?: number;
};

// the first image is the cover
export const getCoverImage = (product: { images: { path: string }[] }) =>
	product.images[0]?.path;

export const createProduct = async ({
	name,
	priceInCents,
	description,
	imagePaths,
	categoryId,
	quantity,
}: CreateProductProps) => {
	try {
		return await db.product.create({
			data: {
				name,
				priceInCents,
				description,
				categoryId,
				quantity,
				images: {
					create: imagePaths.map((path, position) => ({ path, position })),
				},
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
				images: orderedImages,
				_count: { select: { Orders_Products: true } },
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
				images: orderedImages,
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

// keepPaths are the existing images to retain, in their new order; addedPaths
// are newly uploaded and go after them. Anything else is removed.
export const updateProductWithImages = async (
	id: string,
	data: UpdateProductFields,
	keepPaths: string[],
	addedPaths: string[]
) => {
	try {
		return await db.$transaction(async (tx) => {
			await tx.productImage.deleteMany({
				where: { productId: id, path: { notIn: keepPaths } },
			});
			for (let position = 0; position < keepPaths.length; position++) {
				await tx.productImage.updateMany({
					where: { productId: id, path: keepPaths[position] },
					data: { position },
				});
			}
			await tx.productImage.createMany({
				data: addedPaths.map((path, i) => ({
					productId: id,
					path,
					position: keepPaths.length + i,
				})),
			});
			return tx.product.update({ where: { id }, data });
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
				images: orderedImages,
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
				images: orderedImages,
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
				images: orderedImages,
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
			images: orderedImages,
		},
	});

// search available products by name or description
export const searchAvailableProducts = async (query: string) => {
	try {
		return await db.product.findMany({
			where: {
				isAvailable: true,
				OR: [{ name: { contains: query } }, { description: { contains: query } }],
			},
			include: {
				category: true,
				images: orderedImages,
			},
		});
	} catch (error) {
		return error;
	}
};

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
