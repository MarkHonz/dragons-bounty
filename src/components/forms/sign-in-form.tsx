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

		// if (result.success && result.cartItems.length > 0) {
		// add cart items from result.cartItems to cartItems in local storage
		const newCartItems = cartItems.concat(result.cartItems || []);
		localStorage.setItem('cartItems', JSON.stringify(newCartItems));
		// }

		console.log('data:', data);
		console.log('result:', result);
		console.log('newCartItems:', newCartItems);
		if (result.success) {
			router.back();
		}
	};

	return (
		<Form {...form}>
			<form
				className="flex flex-col gap-2 max-w-md w-full m-auto p-2 bg-stone-300 rounded-lg"
				onSubmit={form.handleSubmit(handleSubmit)}
			>
				<legend className="text-center text-lg p-2">Sign In</legend>
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
				<fieldset>
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
				</fieldset>
				<Button type="submit">Submit</Button>
				<Link
					className="text-center mt-5 border-t-2 text-blue-800"
					href="/create-account"
				>
					{/* <Button type="button" variant="secondary" className="m-2"> */}
					Create A New Account
					{/* </Button> */}
				</Link>
			</form>
		</Form>
	);
}
