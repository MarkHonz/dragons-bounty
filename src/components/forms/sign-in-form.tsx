'use client';

import * as z from 'zod';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
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
import { safeRedirectPath } from '@/lib/redirects';
import { useHydrated } from '@/lib/use-hydrated';

const formSchema = z // create a schema for the form data
	.object({
		email: z.string().email(),
		password: z
			.string()
			.min(6, { message: 'Password must be at least 6 characters' }),
	});

type Inputs = z.infer<typeof formSchema>;

type SignInFormProps = {
	// where to go after signing in; without it the person goes back to the page they came from
	next?: string | null;
};

export default function SignInForm({ next }: SignInFormProps) {
	const router = useRouter();
	const [showPassword, setShowPassword] = useState(false);
	// keeps Submit disabled until the form's JavaScript is running (see useHydrated)
	const hydrated = useHydrated();
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
			// check again here even though the page already did: this must never
			// send anyone to another site
			const destination = safeRedirectPath(next);
			if (destination) {
				router.push(destination);
			} else {
				router.back();
			}
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
												<div className="relative">
													<Input
														placeholder="password"
														type={showPassword ? 'text' : 'password'}
														className="pr-10"
														{...field}
													/>
													<button
														type="button"
														onClick={() => setShowPassword((prev) => !prev)}
														className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
														aria-label={
															showPassword ? 'Hide password' : 'Show password'
														}
													>
														{showPassword ? (
															<EyeOff className="h-4 w-4" />
														) : (
															<Eye className="h-4 w-4" />
														)}
													</button>
												</div>
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
									? `/create-account?next=${encodeURIComponent(next as string)}`
									: '/create-account'
							}
						>
							Create A New Account
						</Link>
					</CardContent>
				</form>
			</Card>
		</Form>
	);
}
