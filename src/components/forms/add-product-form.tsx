'use client';

import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { productSubmit } from '@/actions/product-actions';
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
		categoryId: z
			.string()
			.min(2, { message: 'Category must be at least 2 characters' }),
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
// infer the type of the form data
type Inputs = z.infer<typeof formSchema>;
// infer the type of the categories
type AddProductFormProps = {
	categories: CategoryProps[];
};
// create a form component
export default function AddProductForm({ categories }: AddProductFormProps) {
	// create a router instance
	const router = useRouter();
	// create a form instance
	const form = useForm<Inputs>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: '',
			priceInCents: '',
			description: '',
			categoryId: '',
			image: '',
			quantity: '',
		},
	});
	// create a submit handler
	const handleSubmit: SubmitHandler<Inputs> = async (data: Inputs) => {
		try {
			const formData = new FormData();
			formData.append('name', data.name);
			formData.append('priceInCents', data.priceInCents);
			formData.append('description', data.description);
			formData.append('quantity', data.quantity);
			formData.append('categoryId', data.categoryId);
			formData.append('image', data.image[0]);
			const result = await productSubmit({}, formData);
			if (result.success) {
				router.push('/admin/products');
			}
		} catch (error) {
			console.error('Failed to submit the form', error);
		}
	};
	// return the form component
	return (
		<Form {...form}>
			<form
				className="flex flex-col gap-2 max-w-md w-full m-auto p-2 mt-10 bg-stone-300 rounded-lg"
				onSubmit={form.handleSubmit(handleSubmit)}
			>
				<legend className="text-center text-lg">Add Product</legend>
				<fieldset>
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => {
							return (
								<FormItem className="pb-2">
									<FormControl>
										<Input placeholder="product" type="text" {...field} />
									</FormControl>
									<FormLabel className="pl-2">Name</FormLabel>
									<FormMessage />
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
										<Input placeholder="price" type="number" {...field} />
									</FormControl>
									<FormLabel className="pl-2">Price</FormLabel>
									<FormMessage />
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
										<Input placeholder="description" type="text" {...field} />
									</FormControl>
									<FormLabel className="pl-2">Description</FormLabel>
									<FormMessage />
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
										<Input placeholder="quantity" type="number" {...field} />
									</FormControl>
									<FormLabel className="pl-2">Quantity</FormLabel>
									<FormMessage />
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
												<SelectValue placeholder="Select a category" />
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
									<FormLabel className="pl-2">Category</FormLabel>
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
