'use client';

import * as z from 'zod';
import { useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, SubmitHandler } from 'react-hook-form';

import { requestPasswordResetAction } from '@/actions/password-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useHydrated } from '@/lib/use-hydrated';

const formSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
});

type Inputs = z.infer<typeof formSchema>;

export default function ForgotPasswordForm() {
	const hydrated = useHydrated();
	const [errors, setErrors] = useState<string[]>([]);
	const [sentTo, setSentTo] = useState<string | null>(null);
	const [sending, setSending] = useState(false);
	const form = useForm<Inputs>({
		resolver: zodResolver(formSchema),
		defaultValues: { email: '' },
	});

	const handleSubmit: SubmitHandler<Inputs> = async (data) => {
		const formData = new FormData();
		formData.append('email', data.email);
		setSending(true);
		setErrors([]);
		const result = await requestPasswordResetAction({}, formData);
		setSending(false);
		if (!result.success) {
			setErrors(result.errors);
			return;
		}
		setSentTo(data.email);
	};

	return (
		<Card className="m-auto w-full max-w-md shadow-warm-sm">
			<CardHeader>
				<CardTitle className="text-center font-display text-2xl">
					Forgot Password
				</CardTitle>
			</CardHeader>
			{sentTo ? (
				<CardContent className="flex flex-col gap-4 text-center">
					<p role="status">
						If an account exists for{' '}
						<strong className="break-all">{sentTo}</strong>, we&apos;ve sent it
						a link to choose a new password. The link works once and expires in
						1 hour.
					</p>
					<p className="text-sm text-muted-foreground">
						Nothing arrived? Check your spam folder, or try again in a minute.
					</p>
					<Link href="/sign-in?next=%2F" className="text-primary">
						Back to sign in
					</Link>
				</CardContent>
			) : (
				<Form {...form}>
					<form
						className="flex flex-col gap-2"
						onSubmit={form.handleSubmit(handleSubmit)}
					>
						<CardContent className="flex flex-col gap-2">
							<p className="pb-2 text-center text-sm text-muted-foreground">
								Enter the email address for your account and we&apos;ll send you
								a link to choose a new password.
							</p>
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem className="pb-2">
										<FormLabel className="pl-2">Email</FormLabel>
										<FormControl>
											<Input
												placeholder="email address"
												type="email"
												autoComplete="email"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							{errors.length > 0 && (
								<p
									className="text-sm font-medium text-destructive"
									role="alert"
								>
									{errors.join(' ')}
								</p>
							)}
							<Button
								type="submit"
								className="rounded-full"
								disabled={!hydrated || sending}
							>
								{sending ? 'Sending...' : 'Send Reset Link'}
							</Button>
							{/* signing in from here goes to the home page, not back to this page */}
							<Link
								href="/sign-in?next=%2F"
								className="mt-5 border-t border-border pt-4 text-center text-primary"
							>
								Back to sign in
							</Link>
						</CardContent>
					</form>
				</Form>
			)}
		</Card>
	);
}
