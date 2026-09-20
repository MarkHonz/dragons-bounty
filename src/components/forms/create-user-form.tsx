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
import { userSubmit } from '@/actions/user-actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { safeRedirectPath } from '@/lib/redirects';
import { useHydrated } from '@/lib/use-hydrated';

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

type CreateUserFormProps = {
	// where to go after the account is created; without it, the account page
	next?: string | null;
};

export default function CreateUserForm({ next }: CreateUserFormProps) {
	const router = useRouter();
	// keeps Submit disabled until the form's JavaScript is running (see useHydrated)
	const hydrated = useHydrated();
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
		// if the user was created successfully, go where they were headed (checked
		// again here so this can never send anyone to another site), else the account
		if (result.success) {
			router.push(safeRedirectPath(next) ?? '/account');
		}
	};

	return (
		<Form {...form}>
			<Card className="m-auto w-full max-w-md shadow-warm-sm">
				<CardHeader>
					<CardTitle className="text-center font-display text-2xl">
						Create An Account
					</CardTitle>
				</CardHeader>
				<form
					className="flex flex-col gap-5"
					onSubmit={form.handleSubmit(handleSubmit)}
				>
					<CardContent className="flex flex-col gap-2">
						<fieldset className="flex flex-col gap-2">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => {
									return (
										<FormItem className="pb-2">
											<FormLabel className="pl-2">Name</FormLabel>
											<FormControl>
												<Input placeholder="username" type="text" {...field} />
											</FormControl>
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
											<FormLabel className="pl-2">Email</FormLabel>
											<FormControl>
												<Input
													placeholder="email address"
													type="email"
													{...field}
												/>
											</FormControl>
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
											<FormLabel className="pl-2">Password</FormLabel>
											<FormControl>
												<Input
													placeholder="password"
													type="password"
													{...field}
												/>
											</FormControl>
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
											<FormLabel className="pl-2">Confirm Password</FormLabel>
											<FormControl>
												<Input
													placeholder="retype password"
													type="password"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
						</fieldset>
						<Button type="submit" className="rounded-full" disabled={!hydrated}>
							Submit
						</Button>
						<Link
							className="mt-5 border-t border-border pt-4 text-center text-primary"
							href={
								safeRedirectPath(next)
									? `/sign-in?next=${encodeURIComponent(next as string)}`
									: '/sign-in'
							}
						>
							Sign In To An Existing Account
						</Link>
					</CardContent>
				</form>
			</Card>
		</Form>
	);
}
