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
import { userLogin } from '@/actions/user-actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const formSchema = z // create a schema for the form data
	.object({
		email: z.string().email(),
		password: z
			.string()
			.min(6, { message: 'Password must be at least 6 characters' }),
	});

type Inputs = z.infer<typeof formSchema>;

export default function SignInForm() {
	const router = useRouter();
	const form = useForm<Inputs>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: '',
			password: '',
		},
	});

	const handleSubmit: SubmitHandler<Inputs> = async (data: Inputs) => {
		const formData = new FormData();
		Object.entries(data).forEach(([key, value]) => {
			formData.append(key, value);
		});

		// get cartItems from local storage
		const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');

		// add cartItems to formData as an array of objects
		formData.append('cartItems', JSON.stringify(cartItems));

		const result = await userLogin({}, formData);

		if (result.success) {
			// the guest cart has now been merged into the DB cart server-side;
			// clear the local copy since the DB is authoritative from here on
			localStorage.removeItem('cartItems');
			localStorage.removeItem('cartId');
			router.back();
			router.refresh();
		}
	};

	return (
		<Form {...form}>
			<Card className="m-auto w-full max-w-md shadow-warm-sm">
				<CardHeader>
					<CardTitle className="text-center font-display text-2xl">
						Sign In
					</CardTitle>
				</CardHeader>
				<form
					className="flex flex-col gap-2"
					onSubmit={form.handleSubmit(handleSubmit)}
				>
					<CardContent className="flex flex-col gap-2">
						<FormMessage>
							{/* // display error messages here */}
							{Object.keys(form.formState.errors).length > 0 && (
								<div>
									{Object.values(form.formState.errors).map((error) => (
										<div key={error.message}>{error.message}</div>
									))}
								</div>
							)}
						</FormMessage>
						<fieldset className="flex flex-col gap-2">
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
												<Input
													placeholder="password"
													type="password"
													{...field}
												/>
											</FormControl>
											<FormLabel className="p-2">Password</FormLabel>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
						</fieldset>
						<Button type="submit" className="rounded-full">
							Submit
						</Button>
						<Link
							className="mt-5 border-t border-border pt-4 text-center text-primary"
							href="/create-account"
						>
							Create A New Account
						</Link>
					</CardContent>
				</form>
			</Card>
		</Form>
	);
}
