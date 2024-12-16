'use client';

import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, SubmitHandler } from 'react-hook-form';
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

const ACCEPTED_IMAGE_TYPES = [
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/webp',
];

const formSchema = z // create a schema for the form data
	.object({
		name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
		priceInCents: z.string().min(1, { message: 'Price must be at least 1' }),
		description: z
			.string()
			.min(2, { message: 'Description must be at least 2 characters' }),
		categoryId: z.string(),
		image: z
			.any()
			.refine(
				(files) => {
					return Array.from(files).every((file) => file instanceof File);
				},
				{ message: 'Please enter an image' }
			)
			.refine(
				(files) =>
					(Array.from(files) as File[]).every((file: File) =>
						ACCEPTED_IMAGE_TYPES.includes(file.type)
					),
				'Only these types are allowed .jpg, .jpeg, .png and .webp'
			),
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
			priceInCents: product.priceInCents.toString(),
			description: product.description,
			categoryId: product.categoryId,
			image: product.imagePath,
			quantity: product.quantity.toString() || '1',
		},
	});

	const handleSubmit: SubmitHandler<Inputs> = async (data: Inputs) => {
		try {
			const formData = new FormData();
			formData.append('id', product.id);
			formData.append('name', data.name);
			formData.append('priceInCents', data.priceInCents);
			formData.append('description', data.description);
			formData.append('categoryId', data.categoryId);
			formData.append('quantity', data.quantity);
			if (product.imagePath) {
				formData.append('imagePath', product.imagePath);
			}
			if (data.image) {
				formData.append('image', data.image[0]);
			}
			await productUpdate({}, formData);
			router.push('/admin/products');
		} catch (error) {
			console.error('Failed to submit the form', error);
		}
	};

	return (
		<Form {...form}>
			<form
				className="flex flex-col gap-5 max-w-md w-full m-auto p-2 bg-stone-300"
				onSubmit={form.handleSubmit(handleSubmit)}
			>
				<legend className="text-center text-lg p-2">Edit Product</legend>
				<fieldset>
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => {
							return (
								<FormItem className="pb-2">
									<FormControl>
										<Input {...field} id="name" defaultValue={product.name} />
									</FormControl>
									<FormLabel className="p-2">Name</FormLabel>
									<FormMessage {...field} />
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name="priceInCents"
						render={({ field }) => {
							return (
								<FormItem className="pb-2">
									<FormControl>
										<Input
											{...field}
											id="priceInCents"
											type="number"
											defaultValue={product.priceInCents / 100}
										/>
									</FormControl>
									<FormLabel className="p-2">Price</FormLabel>
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
									<FormControl>
										<Input
											{...field}
											id="description"
											defaultValue={product.description}
										/>
									</FormControl>
									<FormLabel className="p-2">Description</FormLabel>
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
									<FormControl>
										<Input
											{...field}
											id="quantity"
											type="number"
											defaultValue={product.quantity}
										/>
									</FormControl>
									<FormLabel className="p-2">Quantity</FormLabel>
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
									<FormLabel className="p-2">Category</FormLabel>
									<FormMessage />
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name="image"
						render={({ field }) => {
							return (
								<FormItem className="pb-2">
									<FormControl>
										<Input
											type="file"
											accept="image/png, image/jpeg, image/jpg, image/webp"
											id="image"
											onChange={(event) => {
												const files = (event.target as HTMLInputElement).files;
												if (files) {
													field.onChange(files);
												}
											}}
										/>
									</FormControl>
									<FormLabel className="pl-2">Select Image</FormLabel>
									<FormMessage />
								</FormItem>
							);
						}}
					/>
				</fieldset>
				<Button type="submit">Submit</Button>
			</form>
		</Form>
	);
}
