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
import { categoryUpdate } from '@/actions/category-actions';

const formSchema = z // create a schema for the form data
	.object({
		name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
	});

type Inputs = z.infer<typeof formSchema>;

type EditCategoryFormProps = {
	category: {
		name: string;
		id: string;
		isActive: boolean;
		createdAt: Date;
		updatedAt: Date;
	};
};

export default function EditCategoryForm({ category }: EditCategoryFormProps) {
	const router = useRouter();
	const form = useForm<Inputs>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: category.name,
		},
	});

	const handleSubmit: SubmitHandler<Inputs> = async (data: Inputs) => {
		const result = await categoryUpdate(category.id, data.name);
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
				<legend className="text-center text-lg p-2">Edit Category</legend>
				<fieldset>
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => {
							return (
								<FormItem className="pb-2">
									<FormControl>
										<Input {...field} id="name" defaultValue={category.name} />
									</FormControl>
									<FormLabel className="p-2">Name</FormLabel>
									<FormMessage {...field} />
								</FormItem>
							);
						}}
					/>
				</fieldset>
				<Button type="submit">Update</Button>
			</form>
		</Form>
	);
}
