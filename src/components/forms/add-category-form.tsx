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
import { useRouter } from 'next/navigation';
import { categorySubmit } from '@/actions/category-actions';

const formSchema = z // create a schema for the form data
	.object({
		name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
	});

type Inputs = z.infer<typeof formSchema>;

export default function AddCategoryForm() {
	const router = useRouter();
	const form = useForm<Inputs>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: '',
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
			<form
				className="flex flex-col gap-5 max-w-md w-full m-auto p-2 bg-stone-300"
				onSubmit={form.handleSubmit(handleSubmit)}
			>
				<legend className="text-center text-lg p-2">Add Category</legend>
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
				</fieldset>
				<Button type="submit">Submit</Button>
			</form>
		</Form>
	);
}
