'use server';

import z from 'zod';
import { revalidatePath } from 'next/cache';
import {
	S3Client,
	PutObjectCommand,
	DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import slugify from 'slugify';

import { assertAdminOrThrow } from '@/lib/auth';
import { parseVariantInputs } from '@/lib/variant-input';
import {
	createProduct,
	deleteProduct,
	getProductById,
	getPurchaseInfo,
	ProductProps,
	toggleProductAvailable,
	toggleProductFeatured,
	updateProductWithImages,
} from '@/db/product-db';
import { MAX_PRODUCT_IMAGES, validateImageFile } from '@/lib/product-images';
import { parsePriceToCents } from '@/lib/formatters';
import { logActivity } from '@/db/activity-db';

const s3Client = new S3Client({
	region: process.env.NEXT_AWS_S3_REGION!,
	endpoint: process.env.NEXT_AWS_S3_ENDPOINT,
	credentials: {
		accessKeyId: process.env.NEXT_AWS_S3_ACCESS_KEY_ID!,
		secretAccessKey: process.env.NEXT_AWS_S3_SECRET_ACCESS_KEY!,
	},
});

const deleteObjects = async (keys: string[]) => {
	await Promise.all(
		keys.map(async (key) => {
			try {
				await s3Client.send(
					new DeleteObjectCommand({
						Bucket: process.env.NEXT_AWS_S3_BUCKET!,
						Key: key,
					})
				);
			} catch (error) {
				console.error('Failed to delete product image', key, error);
			}
		})
	);
};

// returns an error message, or null when every entry is an acceptable image
const validateImages = (files: unknown[]) => {
	for (const file of files) {
		if (!(file instanceof File)) {
			return 'Invalid image';
		}
		const error = validateImageFile(file);
		if (error) {
			return error;
		}
	}
	return null;
};

// uploads every file; if one fails, the ones already uploaded are removed again
const uploadImages = async (files: File[], name: string) => {
	const slug = slugify(name, { lower: true, strict: true }) || 'product';
	const keys: string[] = [];
	try {
		for (let index = 0; index < files.length; index++) {
			const file = files[index];
			const key = `${slug}-${Date.now()}-${index}`;
			await s3Client.send(
				new PutObjectCommand({
					Bucket: process.env.NEXT_AWS_S3_BUCKET!,
					Key: key,
					Body: Buffer.from(await file.arrayBuffer()),
					ContentType: file.type,
				})
			);
			keys.push(key);
		}
		return keys;
	} catch (error) {
		await deleteObjects(keys);
		throw error;
	}
};

export const productSubmit = async (
	previousState: object,
	formData: FormData
) => {
	const { user: admin } = await assertAdminOrThrow();

	const name = formData.get('name') as string | null;
	const price = formData.get('price') as string | null;
	const description = formData.get('description') as string | null;
	let quantity = formData.get('quantity') as string | number | null;
	const categoryId = formData.get('categoryId') as string | null;
	const images = formData.getAll('images');
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// options (sizes, colours...) are optional; most products have none
	const parsedOptions = parseVariantInputs(formData.get('variants'));
	if ('error' in parsedOptions) {
		response.errors.push(parsedOptions.error);
		return response;
	}
	const variants = parsedOptions.variants;

	// Create a schema for the form data
	const schema = z.object({
		name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
		price: z.string().min(1, { message: 'Price is required' }),
		description: z
			.string()
			.min(2, { message: 'Description must be at least 2 characters' }),
		categoryId: z
			.string()
			.min(2, { message: 'Category must be at least 2 characters' }),
		// a product with options is stocked per option, so it has no quantity of its own
		quantity:
			variants.length > 0
				? z.string()
				: z.string().min(1, { message: 'Quantity must be at least 1' }),
	});

	try {
		// Validate the form data
		schema.parse({
			name,
			price,
			description,
			categoryId,
			quantity,
		});
	} catch (error) {
		const { errors } = error as z.ZodError;
		errors.map((error) => {
			response.errors.push(error.message);
		});
		return response;
	}

	const priceInCents = parsePriceToCents(price as string);
	quantity = variants.length > 0 ? 0 : parseInt(quantity as string, 10);

	// Check if the name is a string
	if (typeof name !== 'string') {
		response.errors.push('Invalid name');
		return response;
	}

	if (priceInCents === null) {
		response.errors.push('Enter a price like 29.99');
		return response;
	}

	if (typeof description !== 'string') {
		response.errors.push('Invalid description');
		return response;
	}

	if (typeof quantity !== 'number' || Number.isNaN(quantity)) {
		response.errors.push('Invalid quantity');
		return response;
	}

	if (typeof categoryId !== 'string') {
		response.errors.push('Invalid category');
		return response;
	}

	if (images.length < 1 || images.length > MAX_PRODUCT_IMAGES) {
		response.errors.push(
			`A product needs between 1 and ${MAX_PRODUCT_IMAGES} images`
		);
		return response;
	}

	const imageError = validateImages(images);
	if (imageError) {
		response.errors.push(imageError);
		return response;
	}

	// Upload the images to the bucket
	let imageKeys: string[];
	try {
		imageKeys = await uploadImages(images as File[], name);
	} catch (error) {
		console.error('Failed to upload product images', error);
		response.errors.push('Failed to upload the images');
		return response;
	}

	// Create the product; if that fails, don't leave the uploads orphaned
	const created = await createProduct({
		name,
		priceInCents,
		description,
		categoryId,
		imagePaths: imageKeys,
		quantity,
		variants,
	});
	if (created instanceof Error) {
		await deleteObjects(imageKeys);
		response.errors.push('Failed to create the product');
		return response;
	}

	await logActivity(admin.id, 'PRODUCT', `Created the product "${name}"`);

	// Revalidate the product page
	revalidatePath(`/products`, 'layout');

	response.success = true;
	return response;
};

export const productDelete = async (id: string) => {
	const { user: admin } = await assertAdminOrThrow();

	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// look the images up here rather than trusting the client; the rows are
	// removed with the product, so they have to be read first
	const existing = await getProductById(id);
	const imageKeys =
		existing && !(existing instanceof Error)
			? (existing as ProductProps).images.map((image) => image.path)
			: [];

	// Delete the product first; only remove its images once that has succeeded
	const deleted = await deleteProduct(id);
	if (deleted instanceof Error) {
		// P2003: a foreign key (order history) still points at this product
		response.errors.push(
			(deleted as { code?: string }).code === 'P2003'
				? "This product is on existing orders and can't be deleted. Mark it unavailable instead."
				: 'Failed to delete the product.'
		);
		return response;
	}

	await deleteObjects(imageKeys);

	await logActivity(
		admin.id,
		'PRODUCT',
		`Deleted the product "${
			existing && !(existing instanceof Error)
				? (existing as ProductProps).name
				: id
		}"`
	);

	revalidatePath(`/products`, 'layout');
	response.success = true;
	return response;
};

export const toggleAvailable = async (id: string, isActive: boolean) => {
	const { user: admin } = await assertAdminOrThrow();

	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// Update the product
	const updated = await toggleProductAvailable(id, isActive);
	if (!(updated instanceof Error)) {
		await logActivity(
			admin.id,
			'PRODUCT',
			`${isActive ? 'Made available' : 'Hid'} the product "${(updated as { name: string }).name}"`
		);
	}

	response.success = true;
	return response;
};

export const toggleFeatured = async (id: string, isFeatured: boolean) => {
	const { user: admin } = await assertAdminOrThrow();

	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	const updated = await toggleProductFeatured(id, isFeatured);
	if (updated instanceof Error) {
		response.errors.push('Failed to update the product');
		return response;
	}

	await logActivity(
		admin.id,
		'PRODUCT',
		`${isFeatured ? 'Featured' : 'Removed the Featured flag from'} the product "${(updated as { name: string }).name}"`
	);

	// the homepage, category pages and search all list featured products first
	revalidatePath('/', 'layout');

	response.success = true;
	return response;
};

export const productUpdate = async (
	previousState: object,
	formData: FormData
) => {
	const { user: admin } = await assertAdminOrThrow();

	const name = formData.get('name') as string | null;
	const price = formData.get('price') as string | null;
	const description = formData.get('description') as string | null;
	const categoryId = formData.get('categoryId') as string | null;
	const id = formData.get('id') as string | null;
	let quantity = formData.get('quantity') as string | number | null;
	const keepImages = formData.get('keepImages') as string | null;
	const newImages = formData.getAll('newImages');
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// the product's full list of options after this edit (empty for none)
	const parsedOptions = parseVariantInputs(formData.get('variants'));
	if ('error' in parsedOptions) {
		response.errors.push(parsedOptions.error);
		return response;
	}
	const variants = parsedOptions.variants;

	// Create a schema for the form data
	const schema = z.object({
		name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
		price: z.string().min(1, { message: 'Price is required' }),
		description: z
			.string()
			.min(2, { message: 'Description must be at least 2 characters' }),
		categoryId: z
			.string()
			.min(2, { message: 'Category must be at least 2 characters' }),
		id: z.string().min(2, { message: 'Id must be at least 2 characters' }),
		// a product with options is stocked per option, so it has no quantity of its own
		quantity:
			variants.length > 0
				? z.string()
				: z.string().min(1, { message: 'Quantity must be at least 1' }),
		keepImages: z.string(),
	});

	try {
		// Validate the form data
		schema.parse({
			name,
			price,
			description,
			categoryId,
			id,
			quantity,
			keepImages,
		});
	} catch (error) {
		const { errors } = error as z.ZodError;
		errors.map((error) => {
			response.errors.push(error.message);
		});
		return response;
	}

	const priceInCents = parsePriceToCents(price as string);
	quantity = variants.length > 0 ? 0 : parseInt(quantity as string, 10);

	// Check if the name is a string
	if (typeof name !== 'string') {
		response.errors.push('Invalid name');
		return response;
	}

	if (priceInCents === null) {
		response.errors.push('Enter a price like 29.99');
		return response;
	}

	if (typeof description !== 'string') {
		response.errors.push('Invalid description');
		return response;
	}

	if (typeof categoryId !== 'string') {
		response.errors.push('Invalid category');
		return response;
	}

	if (typeof id !== 'string') {
		response.errors.push('Invalid id');
		return response;
	}

	if (typeof quantity !== 'number' || Number.isNaN(quantity)) {
		response.errors.push('Invalid quantity');
		return response;
	}

	// the images to keep, in their new order
	let keepPaths: string[];
	try {
		const parsed = JSON.parse(keepImages as string);
		if (
			!Array.isArray(parsed) ||
			!parsed.every((path) => typeof path === 'string') ||
			new Set(parsed).size !== parsed.length
		) {
			throw new Error('bad keepImages');
		}
		keepPaths = parsed;
	} catch {
		response.errors.push('Invalid image list');
		return response;
	}

	// only images that already belong to this product can be kept
	const existing = await getProductById(id);
	if (!existing || existing instanceof Error) {
		response.errors.push('Product not found');
		return response;
	}
	const currentPaths = (existing as ProductProps).images.map(
		(image) => image.path
	);
	if (!keepPaths.every((path) => currentPaths.includes(path))) {
		response.errors.push('Invalid image list');
		return response;
	}

	const total = keepPaths.length + newImages.length;
	if (total < 1 || total > MAX_PRODUCT_IMAGES) {
		response.errors.push(
			`A product needs between 1 and ${MAX_PRODUCT_IMAGES} images`
		);
		return response;
	}

	const imageError = validateImages(newImages);
	if (imageError) {
		response.errors.push(imageError);
		return response;
	}

	let addedPaths: string[];
	try {
		addedPaths = await uploadImages(newImages as File[], name);
	} catch (error) {
		console.error('Failed to upload product images', error);
		response.errors.push('Failed to upload the images');
		return response;
	}

	// Update the product; if that fails, don't leave the new uploads orphaned
	const updated = await updateProductWithImages(
		id,
		{ name, priceInCents, description, categoryId, quantity },
		keepPaths,
		addedPaths,
		variants
	);
	if (updated instanceof Error) {
		await deleteObjects(addedPaths);
		response.errors.push('Failed to update the product');
		return response;
	}

	// only now remove the images that were taken off the product
	await deleteObjects(currentPaths.filter((path) => !keepPaths.includes(path)));

	await logActivity(admin.id, 'PRODUCT', `Edited the product "${name}"`);

	// Revalidate the product page
	revalidatePath(`/products`, 'layout');
	revalidatePath(`/products/${id}`, 'layout');
	revalidatePath(`/products/${id}/edit`, 'layout');
	// carts may have lost lines when options changed
	revalidatePath('/cart');

	response.success = true;
	return response;
};

// Stock, price and availability of one cart line (a product, plus its chosen
// option if it has options), for the guest cart, which lives in the browser. It
// only says what the product page already shows, so it is public. quantity is
// null when stock isn't tracked; 0 means sold out.
export const getProductPurchaseInfo = async (
	productId: string,
	variantId = ''
) => {
	const info = await getPurchaseInfo(productId, variantId);
	return info
		? {
				quantity: info.quantity,
				buyable: info.buyable,
				priceInCents: info.priceInCents,
				productName: info.productName,
				variantName: info.variantName,
			}
		: {
				quantity: 0,
				buyable: false,
				priceInCents: 0,
				productName: '',
				variantName: '',
			};
};
