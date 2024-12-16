'use client';

import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import {
	Elements,
	LinkAuthenticationElement,
	PaymentElement,
	useElements,
	useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../ui/card';
import { formatCurrency } from '@/lib/formatters';
import { FormEvent, useState } from 'react';
import { userAddAddress } from '@/actions/user-actions';

const formSchema = z // create a schema for the form data
	.object({
		address1: z.string().min(2, 'Address is required'),
		address2: z.string().optional(),
		city: z.string().min(2, 'City is required'),
		state: z.string().min(2, 'State is required'),
		zip: z.string().min(5, 'Zip code is required'),
		useForShipping: z.boolean().optional().default(false),
	});

type Inputs = z.infer<typeof formSchema>;

type CheckoutFormProps = {
	clientSecret: string;
	orderTotal: number;
	user: string;
};

const stripePromise = loadStripe(
	process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY as string
);

export default function AddAddressForm({
	clientSecret,
	orderTotal,
	user,
}: CheckoutFormProps) {
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};
	// create state for response
	const [responseState, setResponseState] = useState(response);
	const form = useForm<Inputs>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			address1: '',
			address2: '',
			city: '',
			state: '',
			zip: '',
			useForShipping: false,
		},
	});

	const handleSubmit: SubmitHandler<Inputs> = async (data: Inputs) => {
		const formData = new FormData();
		Object.entries(data).forEach(([key, value]) => {
			formData.append(key, value.toString());
		});
		// add user to form data
		formData.append('user', user);

		// add address to user profile
		setResponseState(await userAddAddress({}, formData));
	};

	return (
		<>
			<Form {...form}>
				<form
					className="flex flex-col gap-2 max-w-md w-full m-auto p-6 bg-stone-300 rounded-lg"
					onSubmit={form.handleSubmit(handleSubmit)}
				>
					<legend className="text-center text-lg p-2">Shipping Address</legend>
					<FormField
						control={form.control}
						name="address1"
						render={({ field }) => {
							return (
								<FormItem>
									<FormMessage />
									<FormControl>
										<Input placeholder="address1" type="text" {...field} />
									</FormControl>
									<FormLabel className="pl-2">Address 1</FormLabel>
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name="address2"
						render={({ field }) => {
							return (
								<FormItem>
									<FormMessage />
									<FormControl>
										<Input placeholder="address2" type="text" {...field} />
									</FormControl>
									<FormLabel className="pl-2">Address 2</FormLabel>
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name="city"
						render={({ field }) => {
							return (
								<FormItem>
									<FormMessage />
									<FormControl>
										<Input placeholder="city" type="text" {...field} />
									</FormControl>
									<FormLabel className="pl-2">City</FormLabel>
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name="state"
						render={({ field }) => {
							return (
								<FormItem>
									<FormMessage />
									<FormControl>
										<Input placeholder="state" type="text" {...field} />
									</FormControl>
									<FormLabel className="pl-2">State</FormLabel>
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name="zip"
						render={({ field }) => {
							return (
								<FormItem>
									<FormMessage />
									<FormControl>
										<Input placeholder="zip" type="text" {...field} />
									</FormControl>
									<FormLabel className="pl-2">Zip Code</FormLabel>
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name="useForShipping"
						render={({ field }) => (
							<FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
								<FormControl>
									<Checkbox
										checked={field.value}
										onCheckedChange={field.onChange}
									/>
								</FormControl>
								<div className="space-y-1 leading-none">
									<FormLabel>Use this address for shipping</FormLabel>
									<FormDescription>
										By checking this box, you agree to use this address for
										shipping.
									</FormDescription>
								</div>
							</FormItem>
						)}
					/>
					<Button type="submit">Add Address</Button>
				</form>
			</Form>
			{responseState.success && (
				<Elements options={{ clientSecret }} stripe={stripePromise}>
					<StripeCheckoutForm orderTotal={orderTotal} />
				</Elements>
			)}
		</>
	);
}

type StripeCheckoutFormProps = {
	orderTotal: number;
};

function StripeCheckoutForm({ orderTotal }: StripeCheckoutFormProps) {
	const stripe = useStripe();
	const elements = useElements();
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string>('');

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();

		if (stripe == null || elements == null) {
			return;
		}

		setIsLoading(true);

		// check for existing order

		stripe
			.confirmPayment({
				elements,
				confirmParams: {
					return_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/purchase-success`,
				},
			})
			.then((result) => {
				if (result.error) {
					if (
						result.error.type === 'card_error' ||
						result.error.type === 'validation_error'
					) {
						setErrorMessage(
							result.error.message ?? 'An unknown error occurred'
						);
					}
				} else {
					setErrorMessage('An unknown error occurred');
				}
			})
			.finally(() => {
				setIsLoading(false);
			});
	};

	return (
		<form onSubmit={handleSubmit}>
			<Card className="m-3">
				<CardHeader>
					<CardTitle>Payment Information</CardTitle>
					<CardDescription className="text-destructive">
						{errorMessage && <p>{errorMessage}</p>}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<PaymentElement />
					<LinkAuthenticationElement className="mt-3" />
				</CardContent>
				<CardFooter className="flex justify-end">
					<Button disabled={stripe == null || elements == null || isLoading}>
						{isLoading
							? 'Purchasing...'
							: ` Purchase - ${formatCurrency(orderTotal / 100)}`}
					</Button>
				</CardFooter>
			</Card>
		</form>
	);
}
