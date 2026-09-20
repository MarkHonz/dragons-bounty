'use client';

import * as z from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, SubmitHandler } from 'react-hook-form';

import { resetPasswordAction } from '@/actions/password-actions';
import PasswordInput from '@/components/password-input';
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
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/lib/password-rules';
import { useHydrated } from '@/lib/use-hydrated';

const formSchema = z
	.object({
		newPassword: z
			.string()
			.min(
				MIN_PASSWORD_LENGTH,
				`Password must be at least ${MIN_PASSWORD_LENGTH} characters`
			)
			.max(
				MAX_PASSWORD_LENGTH,
				`Password must be ${MAX_PASSWORD_LENGTH} characters or fewer`
			),
		confirmPassword: z.string(),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "The passwords don't match",
		path: ['confirmPassword'],
	});

type Inputs = z.infer<typeof formSchema>;

// `token` is the one from the emailed link. It is sent with the new password and
// only used up when the server accepts them.
export default function ResetPasswordForm({ token }: { token: string }) {
	const router = useRouter();
	const hydrated = useHydrated();
	const [errors, setErrors] = useState<string[]>([]);
	const [saving, setSaving] = useState(false);
	const form = useForm<Inputs>({
		resolver: zodResolver(formSchema),
		defaultValues: { newPassword: '', confirmPassword: '' },
	});

	const handleSubmit: SubmitHandler<Inputs> = async (data) => {
		const formData = new FormData();
		formData.append('token', token);
		formData.append('newPassword', data.newPassword);
		formData.append('confirmPassword', data.confirmPassword);
		setSaving(true);
		setErrors([]);
		const result = await resetPasswordAction({}, formData);
		setSaving(false);
		if (!result.success) {
			setErrors(result.errors);
			return;
		}
		router.push('/sign-in?notice=password-reset');
	};

	return (
		<Form {...form}>
			<Card className="m-auto w-full max-w-md shadow-warm-sm">
				<CardHeader>
					<CardTitle className="text-center font-display text-2xl">
						Choose a New Password
					</CardTitle>
				</CardHeader>
				<form
					className="flex flex-col gap-2"
					onSubmit={form.handleSubmit(handleSubmit)}
				>
					<CardContent className="flex flex-col gap-2">
						<FormField
							control={form.control}
							name="newPassword"
							render={({ field }) => (
								<FormItem className="pb-2">
									<FormLabel className="pl-2">New password</FormLabel>
									<FormControl>
										<PasswordInput autoComplete="new-password" {...field} />
									</FormControl>
									<p className="pl-2 text-xs text-muted-foreground">
										At least {MIN_PASSWORD_LENGTH} characters.
									</p>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="confirmPassword"
							render={({ field }) => (
								<FormItem className="pb-2">
									<FormLabel className="pl-2">Confirm new password</FormLabel>
									<FormControl>
										<PasswordInput autoComplete="new-password" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						{errors.length > 0 && (
							<p className="text-sm font-medium text-destructive" role="alert">
								{errors.join(' ')}
							</p>
						)}
						<Button
							type="submit"
							className="rounded-full"
							disabled={!hydrated || saving}
						>
							{saving ? 'Saving...' : 'Set New Password'}
						</Button>
					</CardContent>
				</form>
			</Card>
		</Form>
	);
}
