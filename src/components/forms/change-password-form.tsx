'use client';

import * as z from 'zod';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, SubmitHandler } from 'react-hook-form';

import { changePasswordAction } from '@/actions/password-actions';
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
		currentPassword: z.string().min(1, 'Enter your current password'),
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

const EMPTY: Inputs = {
	currentPassword: '',
	newPassword: '',
	confirmPassword: '',
};

export default function ChangePasswordForm() {
	// keeps Submit disabled until the form's JavaScript is running, so a password
	// can never be sent in the address bar by a plain form submission
	const hydrated = useHydrated();
	const [errors, setErrors] = useState<string[]>([]);
	const [done, setDone] = useState(false);
	const [saving, setSaving] = useState(false);
	const form = useForm<Inputs>({
		resolver: zodResolver(formSchema),
		defaultValues: EMPTY,
	});

	const handleSubmit: SubmitHandler<Inputs> = async (data) => {
		const formData = new FormData();
		Object.entries(data).forEach(([key, value]) => formData.append(key, value));
		setSaving(true);
		setErrors([]);
		setDone(false);
		const result = await changePasswordAction({}, formData);
		setSaving(false);
		if (!result.success) {
			setErrors(result.errors);
			return;
		}
		form.reset(EMPTY);
		setDone(true);
	};

	return (
		<Form {...form}>
			<Card className="mt-6 w-full shadow-warm-sm">
				<CardHeader>
					<CardTitle className="text-center font-display text-2xl">
						Change Password
					</CardTitle>
				</CardHeader>
				<form
					className="flex flex-col gap-2"
					onSubmit={form.handleSubmit(handleSubmit)}
				>
					<CardContent className="flex flex-col gap-2">
						<FormField
							control={form.control}
							name="currentPassword"
							render={({ field }) => (
								<FormItem className="pb-2">
									<FormLabel className="pl-2">Current password</FormLabel>
									<FormControl>
										<PasswordInput autoComplete="current-password" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
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
						{done && (
							<p className="text-sm font-medium text-primary" role="status">
								Your password was changed. Any other devices have been signed
								out.
							</p>
						)}
						<Button
							type="submit"
							className="rounded-full"
							disabled={!hydrated || saving}
						>
							{saving ? 'Saving...' : 'Change Password'}
						</Button>
					</CardContent>
				</form>
			</Card>
		</Form>
	);
}
