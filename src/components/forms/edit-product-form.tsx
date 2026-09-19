'use client';

import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { productUpdate } from '@/actions/product-actions';
import { ProductProps } from '@/db/product-db';
import { CategoryProps } from '@/db/category-db';
import ProductImagesField, {
	ProductImagesValue,
} from '@/components/forms/product-images-field';
import { MAX_PRODUCT_IMAGES } from '@/lib/product-images';

const formSchema = z // create a schema for the form data
	.object({
		name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
		price: z
			.string()
			.regex(/^\d+(\.\d{1,2})?$/, { message: 'Enter a price like 29.99' })
			.refine((value) => Number(value) > 0, { message: 'Price must be more than 0' }),
		description: z
			.string()
			.min(2, { message: 'Description must be at least 2 characters' }),
		categoryId: z.string(),
		quantity: z.string().min(1, { message: 'Quantity must be at least 1' }),
	});

type Inputs = z.infer<typeof formSchema>;

type ProductFormProps = {
	product: ProductProps;
	categories: CategoryProps[];
};

export default function EditProductForm({
	product,
	categories,
}: ProductFormProps) {
	const router = useRouter();
	const form = useForm<Inputs>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: product.name,
			price: (product.priceInCents / 100).toFixed(2),
			description: product.description,
			categoryId: product.categoryId,
			quantity: product.quantity?.toString() ?? '1',
		},
	});

	const [images, setImages] = useState<ProductImagesValue>({
		keep: product.images.map((image) => image.path),
		added: [],
	});
	const [imageError, setImageError] = useState('');
	const [formError, setFormError] = useState('');

	const handleSubmit: SubmitHandler<Inputs> = async (data: Inputs) => {
		setFormError('');
		const total = images.keep.length + images.added.length;
		if (total < 1 || total > MAX_PRODUCT_IMAGES) {
			setImageError(`A product needs between 1 and ${MAX_PRODUCT_IMAGES} images`);
			return;
		}
		setImageError('');
		try {
			const formData = new FormData();
			formData.append('id', product.id);
			formData.append('name', data.name);
			formData.append('price', data.price);
			formData.append('description', data.description);
			formData.append('categoryId', data.categoryId);
			formData.append('quantity', data.quantity);
			formData.append('keepImages', JSON.stringify(images.keep));
			images.added.forEach((file) => formData.append('newImages', file));
			const result = await productUpdate({}, formData);
			if (result.success) {
				router.push('/admin/products');
			} else {
				setFormError(result.errors.join('. '));
			}
		} catch (error) {
			console.error('Failed to submit the form', error);
			setFormError('Something went wrong while saving the product');
		}
	};

	return (
		<Form {...form}>
			<Card className="m-auto mt-4 w-full max-w-md shadow-warm-sm">
				<CardHeader>
					<CardTitle className="text-center font-display text-2xl">
						Edit Product
					</CardTitle>
				</CardHeader>
				<form
					className="flex flex-col gap-5"
					onSubmit={form.handleSubmit(handleSubmit)}
				>
					<CardContent className="flex flex-col gap-2">
				<fieldset>
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => {
							return (
								<FormItem className="pb-2">
									<FormLabel className="pl-2">Name</FormLabel>
									<FormControl>
										<Input {...field} defaultValue={product.name} />
									</FormControl>
									<FormMessage {...field} />
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name="price"
						render={({ field }) => {
							return (
								<FormItem className="pb-2">
									<FormLabel className="pl-2">Price ($)</FormLabel>
									<FormControl>
										<Input
											{...field}
											type="number"
											step="0.01"
											min="0.01"
										/>
									</FormControl>
									<FormMessage {...field} />
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name="description"
						render={({ field }) => {
							return (
								<FormItem className="pb-2">
									<FormLabel className="pl-2">Description</FormLabel>
									<FormControl>
										<Input
											{...field}
											defaultValue={product.description}
										/>
									</FormControl>
									<FormMessage {...field} />
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name="quantity"
						render={({ field }) => {
							return (
								<FormItem className="pb-2">
									<FormLabel className="pl-2">Quantity</FormLabel>
									<FormControl>
										<Input
											{...field}
											type="number"
											defaultValue={product.quantity}
										/>
									</FormControl>
									<FormMessage {...field} />
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name="categoryId"
						render={({ field }) => {
							return (
								<FormItem className="pb-2">
									<FormLabel className="pl-2">Category</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
										{...field}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue
													placeholder={product.category.name}
													defaultValue={product.categoryId}
												/>
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{categories.map((category) => (
												<SelectItem key={category.id} value={category.id}>
													{category.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							);
						}}
					/>
					<ProductImagesField
						value={images}
						onChange={(next) => {
							setImages(next);
							setImageError('');
						}}
						error={imageError}
					/>
				</fieldset>
					{formError && (
						<p className="text-sm font-medium text-destructive">{formError}</p>
					)}
					<Button type="submit" className="rounded-full">
						Submit
					</Button>
					</CardContent>
				</form>
			</Card>
		</Form>
	);
}
