'use server';

import z from 'zod';
import { revalidatePath } from 'next/cache';
import {
	S3Client,
	PutObjectCommand,
	DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import slugify from 'slugify';

import {
	createProduct,
	deleteProduct,
	toggleProductAvailable,
	updateProduct,
} from '@/db/product-db';

const s3Client = new S3Client({
	region: process.env.NEXT_AWS_S3_REGION!,
	credentials: {
		accessKeyId: process.env.NEXT_AWS_S3_ACCESS_KEY_ID!,
		secretAccessKey: process.env.NEXT_AWS_S3_SECRET_ACCESS_KEY!,
	},
});

export const productSubmit = async (
	previousState: object,
	formData: FormData
) => {
	const name = formData.get('name') as string | null;
	let priceInCents = formData.get('priceInCents') as string | number | null;
	const description = formData.get('description') as string | null;
	let quantity = formData.get('quantity') as string | number | null;
	const categoryId = formData.get('categoryId') as string | null;
	const image = formData.get('image') as File | null;
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// Create a schema for the form data
	const schema = z.object({
		name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
		priceInCents: z.string().min(1, { message: 'Price must be at least 1' }),
		description: z
			.string()
			.min(2, { message: 'Description must be at least 2 characters' }),
		categoryId: z
			.string()
			.min(2, { message: 'Category must be at least 2 characters' }),
		image: z.any(),
		quantity: z.string().min(1, { message: 'Quantity must be at least 1' }),
	});

	try {
		// Validate the form data
		schema.parse({
			name,
			priceInCents,
			description,
			categoryId,
			image,
			quantity,
		});
	} catch (error) {
		const { errors } = error as z.ZodError;
		errors.map((error) => {
			response.errors.push(error.message);
		});
		return response;
	}

	priceInCents = parseInt(priceInCents as string, 10);
	quantity = parseInt(quantity as string, 10);

	// Check if the name is a string
	if (typeof name !== 'string') {
		response.errors.push('Invalid name');
		return response;
	}

	if (typeof priceInCents !== 'number') {
		response.errors.push('Invalid price');
		return response;
	}

	if (typeof description !== 'string') {
		response.errors.push('Invalid description');
		return response;
	}

	if (typeof quantity !== 'number') {
		response.errors.push('Invalid quantity');
		return response;
	}

	if (typeof categoryId !== 'string') {
		response.errors.push('Invalid category');
		return response;
	}

	if (!(image instanceof File)) {
		response.errors.push('Invalid image');
		return response;
	}

	const nameSlug = slugify(name, { lower: true });

	//Upload the image to S3
	const imageKey = `${nameSlug}-${Date.now()}`;
	const imageParams = {
		Bucket: process.env.NEXT_AWS_S3_BUCKET!,
		Key: imageKey,
		Body: Buffer.from(await image.arrayBuffer()),
		ContentType: image.type,
	};
	await s3Client.send(new PutObjectCommand(imageParams));

	// Create the product
	await createProduct({
		name,
		priceInCents,
		description,
		categoryId,
		imagePath: imageKey,
		quantity,
	});

	// Revalidate the product page
	revalidatePath(`/products`, 'layout');

	response.success = true;
	return response;
};

export const productDelete = async (id: string, imagePath: string) => {
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	if (imagePath !== '') {
		// Remove image from S3
		const imageParams = {
			Bucket: process.env.NEXT_AWS_S3_BUCKET!,
			Key: imagePath,
		};
		await s3Client.send(new DeleteObjectCommand(imageParams));
	}

	// Delete the product
	(await deleteProduct(id)) as { id: string };

	revalidatePath(`/product`, 'layout');
	response.success = true;
	return response;
};

export const toggleAvailable = async (id: string, isActive: boolean) => {
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// Update the product
	await toggleProductAvailable(id, isActive);

	response.success = true;
	return response;
};

export const productUpdate = async (
	previousState: object,
	formData: FormData
) => {
	const name = formData.get('name') as string | null;
	let priceInCents = formData.get('priceInCents') as string | number | null;
	const description = formData.get('description') as string | null;
	const categoryId = formData.get('categoryId') as string | null;
	const id = formData.get('id') as string | null;
	let quantity = formData.get('quantity') as string | number | null;
	const image = formData.get('image') as File | null;
	const previousImage = formData.get('imagePath') as string | null;
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// Create a schema for the form data
	const schema = z.object({
		name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
		priceInCents: z.string().min(1, { message: 'Price must be at least 1' }),
		description: z
			.string()
			.min(2, { message: 'Description must be at least 2 characters' }),
		categoryId: z
			.string()
			.min(2, { message: 'Category must be at least 2 characters' }),
		id: z.string().min(2, { message: 'Id must be at least 2 characters' }),
		image: z.any(),
		quantity: z.string().min(1, { message: 'Quantity must be at least 1' }),
		previousImage: z.string(),
	});

	try {
		// Validate the form data
		schema.parse({
			name,
			priceInCents,
			description,
			categoryId,
			id,
			image,
			quantity,
			previousImage,
		});
	} catch (error) {
		const { errors } = error as z.ZodError;
		errors.map((error) => {
			response.errors.push(error.message);
		});
		return response;
	}

	priceInCents = parseInt(priceInCents as string, 10);
	quantity = parseInt(quantity as string, 10);

	// Check if the name is a string
	if (typeof name !== 'string') {
		response.errors.push('Invalid name');
		return response;
	}

	if (typeof priceInCents !== 'number') {
		response.errors.push('Invalid price');
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

	if (typeof quantity !== 'number') {
		response.errors.push('Invalid quantity');
		return response;
	}

	if (!(image instanceof File)) {
		response.errors.push('Invalid image');
		return response;
	}

	if (typeof previousImage !== 'string') {
		response.errors.push('Invalid previous image');
		return response;
	}

	const nameSlug = slugify(name, { lower: true });

	//Upload the image to S3
	const imageKey = `${nameSlug}-${Date.now()}`;

	// Check if the image has changed
	if (previousImage !== imageKey) {
		// Create the upload image params
		const UploadImageParams = {
			Bucket: process.env.NEXT_AWS_S3_BUCKET!,
			Key: imageKey,
			Body: Buffer.from(await image.arrayBuffer()),
			ContentType: image.type,
		};
		// Create the delete image params
		const DeleteImageParams = {
			Bucket: process.env.NEXT_AWS_S3_BUCKET!,
			Key: previousImage,
		};
		// Add the image to S3
		await s3Client.send(new PutObjectCommand(UploadImageParams));
		// Remove previous image from S3
		await s3Client.send(new DeleteObjectCommand(DeleteImageParams));
	}

	const data = {
		id,
		name,
		priceInCents,
		description,
		categoryId,
		quantity,
		imagePath: imageKey,
	};

	// Update the product
	await updateProduct(id, data);

	// Revalidate the product page
	revalidatePath(`/products`, 'layout');
	revalidatePath(`/products/${id}`, 'layout');
	revalidatePath(`/products/${id}/edit`, 'layout');
};
