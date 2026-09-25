import db from '@/db/db';
import type { VariantProps } from '@/lib/variants';

export type ProductImageProps = {
	id: string;
	path: string;
	position: number;
};

const orderedImages = { orderBy: { position: 'asc' as const } };
// the only thing about an artist that product listings show: their public name
const artistNameOnly = { select: { artistName: true } };
const orderedVariants = {
	orderBy: [{ position: 'asc' as const }, { createdAt: 'asc' as const }],
};

// What the storefront is allowed to list: the product is switched on, and so is
// its category. (A product page opened by its direct URL is not checked against
// this.)
const visibleOnStorefront = {
	isAvailable: true,
	category: { isActive: true },
};

// The order products appear in on the storefront: featured ones first, then
// newest first. The id only breaks ties so the order never shuffles.
const storefrontOrder = [
	{ isFeatured: 'desc' as const },
	{ createdAt: 'desc' as const },
	{ id: 'asc' as const },
];

export type ProductProps = {
	id: string;
	name: string;
	priceInCents: number;
	description: string;
	images: ProductImageProps[];
	// optional named options; empty for most products
	variants: VariantProps[];
	// the artist who makes and ships it (null = the shop's own product)
	artistId?: string | null;
	artist?: { artistName: string | null } | null;
	categoryId: string;
	isAvailable: boolean;
	isFeatured: boolean;
	createdAt: Date;
	updatedAt: Date;
	quantity: number;
	category: {
		id: string;
		name: string;
		isActive: boolean;
		createdAt: Date;
		updatedAt: Date;
	};
	_count?: { Orders_Products: number };
};

// A product can be opened, put in a cart and checked out only while it is
// switched on and so is its category. The storefront lists use the same rule.
export const isProductBuyable = (product: {
	isAvailable: boolean;
	category: { isActive: boolean };
}) => product.isAvailable && product.category.isActive;

// One option as the admin form sends it. `id` is set for an option that already
// exists (so it can be updated rather than replaced).
export type VariantInput = {
	id?: string;
	name: string;
	priceInCents: number | null;
	quantity: number;
};

export type CreateProductProps = {
	name: string;
	priceInCents: number;
	description: string;
	imagePaths: string[];
	categoryId: string;
	quantity?: number;
	// leave empty (the usual case) for a product sold as a single item
	variants?: VariantInput[];
	// the artist who makes and ships it; null (the default) = the shop's own
	artistId?: string | null;
};

export type UpdateProductFields = {
	name: string;
	priceInCents: number;
	description: string;
	categoryId: string;
	quantity?: number;
	artistId: string | null;
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
	variants = [],
	artistId = null,
}: CreateProductProps) => {
	try {
		return await db.product.create({
			data: {
				name,
				priceInCents,
				description,
				categoryId,
				artistId,
				// a product with options is stocked per option, not as a whole
				quantity: variants.length > 0 ? null : quantity,
				images: {
					create: imagePaths.map((path, position) => ({ path, position })),
				},
				variants: {
					create: variants.map((variant, position) => ({
						name: variant.name,
						priceInCents: variant.priceInCents,
						quantity: variant.quantity,
						position,
					})),
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
				artist: artistNameOnly,
				variants: orderedVariants,
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
				artist: artistNameOnly,
				variants: orderedVariants,
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

export const toggleProductFeatured = async (id: string, isFeatured: boolean) => {
	try {
		return await db.product.update({
			where: { id },
			data: { isFeatured },
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
// are newly uploaded and go after them. Anything else is removed. `variants` is
// the product's full list of options after the edit (empty for none): options with
// a known id are updated, new ones are created, missing ones are removed.
export const updateProductWithImages = async (
	id: string,
	data: UpdateProductFields,
	keepPaths: string[],
	addedPaths: string[],
	variants: VariantInput[] = []
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

			// options: update the ones that exist, create the new ones, remove the rest
			const existing = await tx.productVariant.findMany({
				where: { productId: id },
				select: { id: true },
			});
			const existingIds = new Set(existing.map((variant) => variant.id));
			const keptIds = new Set(
				variants
					.map((variant) => variant.id)
					.filter((variantId): variantId is string =>
						Boolean(variantId && existingIds.has(variantId))
					)
			);
			const removedIds = Array.from(existingIds).filter(
				(variantId) => !keptIds.has(variantId)
			);
			if (removedIds.length > 0) {
				// nobody should be left holding an option that no longer exists
				await tx.cart_Product.deleteMany({
					where: { product_id: id, variant_id: { in: removedIds } },
				});
				await tx.productVariant.deleteMany({ where: { id: { in: removedIds } } });
			}
			for (let position = 0; position < variants.length; position++) {
				const variant = variants[position];
				const fields = {
					name: variant.name,
					priceInCents: variant.priceInCents,
					quantity: variant.quantity,
					position,
				};
				if (variant.id && keptIds.has(variant.id)) {
					await tx.productVariant.update({ where: { id: variant.id }, data: fields });
				} else {
					await tx.productVariant.create({ data: { ...fields, productId: id } });
				}
			}
			// a cart line must match how the product is sold: with an option if it has
			// options, without one if it doesn't
			await tx.cart_Product.deleteMany({
				where: {
					product_id: id,
					variant_id: variants.length > 0 ? '' : { not: '' },
				},
			});

			return tx.product.update({
				where: { id },
				// a product with options is stocked per option, not as a whole
				data: { ...data, quantity: variants.length > 0 ? null : data.quantity },
			});
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
				artist: artistNameOnly,
				variants: orderedVariants,
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
				artist: artistNameOnly,
				variants: orderedVariants,
			},
		});
	} catch (error) {
		return error;
	}
};

export const getAvailableProducts = async () => {
	try {
		return await db.product.findMany({
			where: visibleOnStorefront,
			include: {
				category: true,
				images: orderedImages,
				artist: artistNameOnly,
				variants: orderedVariants,
			},
			orderBy: storefrontOrder,
		});
	} catch (error) {
		return error;
	}
};

// The featured products shown on the homepage: available, in a category that is
// showing, newest first.
export const getFeaturedProducts = async (limit = 8) => {
	try {
		return await db.product.findMany({
			where: { ...visibleOnStorefront, isFeatured: true },
			include: {
				category: true,
				images: orderedImages,
				artist: artistNameOnly,
				variants: orderedVariants,
			},
			orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
			take: limit,
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
			artist: artistNameOnly,
			variants: orderedVariants,
		},
		orderBy: storefrontOrder,
	});

// search available products by name or description
export const searchAvailableProducts = async (query: string) => {
	try {
		return await db.product.findMany({
			where: {
				...visibleOnStorefront,
				OR: [{ name: { contains: query } }, { description: { contains: query } }],
			},
			include: {
				category: true,
				images: orderedImages,
				artist: artistNameOnly,
				variants: orderedVariants,
			},
			orderBy: storefrontOrder,
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

// Everything needed to decide whether one cart line can be bought: for a product
// with options the line must name one of them (its price and stock are the
// option's); for a product without, it must not. A line that doesn't fit, or a
// product that doesn't exist, comes back as not buyable with no stock. Null only
// when the product doesn't exist.
export type PurchaseInfo = {
	buyable: boolean;
	// how many are left; null when stock isn't tracked
	quantity: number | null;
	priceInCents: number;
	productName: string;
	variantName: string;
	// the product is sold in options, so a line must name one
	hasOptions: boolean;
};

export const getPurchaseInfo = async (
	id: string,
	variantId = ''
): Promise<PurchaseInfo | null> => {
	const product = await db.product.findUnique({
		where: { id },
		select: {
			name: true,
			priceInCents: true,
			quantity: true,
			isAvailable: true,
			category: { select: { isActive: true } },
			variants: { select: { id: true, name: true, priceInCents: true, quantity: true } },
		},
	});
	if (!product) return null;

	const hasOptions = product.variants.length > 0;
	const base = {
		priceInCents: product.priceInCents,
		productName: product.name,
		variantName: '',
		hasOptions,
	};
	if (hasOptions) {
		const variant = product.variants.find((option) => option.id === variantId);
		if (!variant) return { ...base, buyable: false, quantity: 0 };
		return {
			productName: product.name,
			variantName: variant.name,
			priceInCents: variant.priceInCents ?? product.priceInCents,
			quantity: variant.quantity,
			buyable: isProductBuyable(product),
			hasOptions,
		};
	}
	// no options, so a line naming one is wrong
	if (variantId !== '') return { ...base, buyable: false, quantity: 0 };
	return { ...base, quantity: product.quantity, buyable: isProductBuyable(product) };
};

// How many of `wanted` can be bought: none when the line isn't buyable,
// otherwise all of them when stock isn't tracked, or no more than what is in
// stock, never below 0.
export const getPurchasableQuantity = async (
	id: string,
	variantId: string,
	wanted: number
): Promise<number> => {
	const info = await getPurchaseInfo(id, variantId);
	if (!info || !info.buyable) return 0;
	if (info.quantity == null) return wanted;
	return Math.max(0, Math.min(wanted, info.quantity));
};

// Take sold units out of stock: the option's stock when the line names one,
// otherwise the product's (skipped when stock isn't tracked). Atomic, so two
// sales at once can't both read the same old number.
export const subtractStock = async (
	productId: string,
	variantId: string,
	quantity: number
) => {
	try {
		if (variantId) {
			await db.productVariant.updateMany({
				where: { id: variantId, productId },
				data: { quantity: { decrement: quantity } },
			});
		} else {
			await db.product.updateMany({
				where: { id: productId, quantity: { not: null } },
				data: { quantity: { decrement: quantity } },
			});
		}
	} catch (error) {
		return error;
	}
};
