'use client';

import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useState } from 'react';
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
import { userUpdateProfile } from '@/actions/user-actions';

const formSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters'),
	address1: z.string().min(2, 'Address is required'),
	address2: z.string().optional(),
	city: z.string().min(2, 'City is required'),
	state: z.string().min(2, 'State is required'),
	zip: z.string().min(5, 'Zip code is required'),
});

type Inputs = z.infer<typeof formSchema>;

type EditProfileFormProps = {
	defaultValues: Inputs;
};

export default function EditProfileForm({
	defaultValues,
}: EditProfileFormProps) {
	const [responseState, setResponseState] = useState<{
		errors: string[];
		success: boolean;
	}>({ errors: [], success: false });

	const form = useForm<Inputs>({
		resolver: zodResolver(formSchema),
		defaultValues,
	});

	const handleSubmit: SubmitHandler<Inputs> = async (data) => {
		const formData = new FormData();
		Object.entries(data).forEach(([key, value]) => {
			formData.append(key, value ?? '');
		});

		setResponseState(await userUpdateProfile({}, formData));
	};

	return (
		<Form {...form}>
			<Card className="m-auto w-full max-w-md shadow-warm-sm">
				<CardHeader>
					<CardTitle className="text-center font-display text-2xl">
						Edit Profile
					</CardTitle>
				</CardHeader>
				<form
					className="flex flex-col gap-2"
					onSubmit={form.handleSubmit(handleSubmit)}
				>
					<CardContent className="flex flex-col gap-2">
					{responseState.success && (
						<p className="text-center text-green-700">Profile updated.</p>
					)}
					{responseState.errors.length > 0 && (
						<div className="text-center text-red-700">
							{responseState.errors.map((error) => (
								<div key={error}>{error}</div>
							))}
						</div>
					)}
					<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="pl-2">Name</FormLabel>
							<FormControl>
								<Input placeholder="name" type="text" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="address1"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="pl-2">Address 1</FormLabel>
							<FormControl>
								<Input placeholder="address1" type="text" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="address2"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="pl-2">Address 2</FormLabel>
							<FormControl>
								<Input placeholder="address2" type="text" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="city"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="pl-2">City</FormLabel>
							<FormControl>
								<Input placeholder="city" type="text" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="state"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="pl-2">State</FormLabel>
							<FormControl>
								<Input placeholder="state" type="text" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="zip"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="pl-2">Zip Code</FormLabel>
							<FormControl>
								<Input placeholder="zip" type="text" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
					<Button type="submit" className="rounded-full">
						Save
					</Button>
					</CardContent>
				</form>
			</Card>
		</Form>
	);
}
