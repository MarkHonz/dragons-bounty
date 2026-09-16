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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { categorySubmit } from '@/actions/category-actions';

const formSchema = z // create a schema for the form data
	.object({
		name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
		description: z
			.string()
			.min(2, { message: 'Description must be at least 2 characters' })
			.optional()
			.or(z.literal('')),
	});

type Inputs = z.infer<typeof formSchema>;

export default function AddCategoryForm() {
	const router = useRouter();
	const form = useForm<Inputs>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: '',
			description: '',
		},
	});

	const handleSubmit: SubmitHandler<Inputs> = async (data: Inputs) => {
		const formData = new FormData();
		Object.entries(data).forEach(([key, value]) => {
			formData.append(key, value);
		});
		const result = await categorySubmit({}, formData);
		if (result.success) {
			router.back();
		}
	};

	return (
		<Form {...form}>
			<Card className="m-auto mt-4 w-full max-w-md shadow-warm-sm">
				<CardHeader>
					<CardTitle className="text-center font-display text-2xl">
						Add Category
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
										<FormItem>
											<FormControl>
												<Input placeholder="category" type="text" {...field} />
											</FormControl>
											<FormLabel className="pl-2">Name</FormLabel>
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
										<FormItem>
											<FormControl>
												<Input placeholder="description" type="text" {...field} />
											</FormControl>
											<FormLabel className="pl-2">Description</FormLabel>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
						</fieldset>
						<Button type="submit" className="rounded-full">
							Submit
						</Button>
					</CardContent>
				</form>
			</Card>
		</Form>
	);
}
