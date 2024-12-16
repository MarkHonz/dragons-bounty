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
import { userSubmit } from '@/actions/user-actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const formSchema = z // create a schema for the form data
	.object({
		name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
		email: z.string().email(),
		password: z
			.string()
			.min(6, { message: 'Password must be at least 6 characters' })
			.max(50),
		passwordconfirm: z.string(),
	})
	// add a custom validation rule to check if the passwords match
	.refine((data) => data.password === data.passwordconfirm, {
		message: 'Passwords do not match',
		path: ['passwordconfirm'], // set the path to the field that should display the error message
	});

type Inputs = z.infer<typeof formSchema>;

export default function CreateUserForm() {
	const router = useRouter();
	const form = useForm<Inputs>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: '',
			email: '',
			password: '',
			passwordconfirm: '',
		},
	});

	const handleSubmit: SubmitHandler<Inputs> = async (data: Inputs) => {
		const formData = new FormData();
		// add form data to the formData object
		Object.entries(data).forEach(([key, value]) => {
			formData.append(key, value);
		});
		// get cartItems from local storage
		const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
		// add cartItems to formData as an array of objects
		formData.append('cartItems', JSON.stringify(cartItems));
		// call the userSubmit function to create a new user
		const result = await userSubmit({}, formData);
		// if the user was created successfully, redirect to the account
		if (result.success) {
			router.push('/account');
		}
	};

	return (
		<Form {...form}>
			<form
				className="flex flex-col gap-5 max-w-md w-full m-auto p-2 bg-stone-300"
				onSubmit={form.handleSubmit(handleSubmit)}
			>
				<legend className="text-center text-lg p-2">Create An Account</legend>
				<fieldset>
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => {
							return (
								<FormItem className="pb-2">
									<FormControl>
										<Input placeholder="username" type="text" {...field} />
									</FormControl>
									<FormLabel className="p-2">Name</FormLabel>
									<FormMessage />
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => {
							return (
								<FormItem className="pb-2">
									<FormControl>
										<Input
											placeholder="email address"
											type="email"
											{...field}
										/>
									</FormControl>
									<FormLabel className="p-2">Email</FormLabel>
									<FormMessage />
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name="password"
						render={({ field }) => {
							return (
								<FormItem className="pb-2">
									<FormControl>
										<Input placeholder="password" type="password" {...field} />
									</FormControl>
									<FormLabel className="p-2">Password</FormLabel>
									<FormMessage />
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name="passwordconfirm"
						render={({ field }) => {
							return (
								<FormItem className="pb-2">
									<FormControl>
										<Input
											placeholder="retype password"
											type="password"
											{...field}
										/>
									</FormControl>
									<FormLabel className="p-2">Confirm Password</FormLabel>
									<FormMessage />
								</FormItem>
							);
						}}
					/>
				</fieldset>
				<Button type="submit">Submit</Button>
				<Link className="text-center mt-5 border-t-2" href="/sign-in">
					Sign In To An Existing Account
				</Link>
			</form>
		</Form>
	);
}
