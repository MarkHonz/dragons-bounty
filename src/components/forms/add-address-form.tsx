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
import { loadStripe, type Appearance } from '@stripe/stripe-js';

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
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../ui/card';
import { formatCurrency } from '@/lib/formatters';
import { FormEvent, useEffect, useState } from 'react';
import { userAddAddress } from '@/actions/user-actions';

const formSchema = z // create a schema for the form data
	.object({
		address1: z.string().min(2, 'Address is required'),
		address2: z.string().optional(),
		city: z.string().min(2, 'City is required'),
		state: z.string().min(2, 'State is required'),
		zip: z.string().min(5, 'Zip code is required'),
	});

type Inputs = z.infer<typeof formSchema>;

type CheckoutFormProps = {
	clientSecret: string;
	orderTotal: number;
	children?: React.ReactNode;
};

const stripePromise = loadStripe(
	process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY as string
);

// One of the site's color variables (they are written in oklch, which Stripe
// doesn't accept) as a plain rgb() color, or null if it can't be read.
const tokenToRgb = (token: string): string | null => {
	const value = getComputedStyle(document.documentElement)
		.getPropertyValue(token)
		.trim();
	const context = document.createElement('canvas').getContext('2d');
	if (!value || !context) return null;
	// an invalid color is ignored by the canvas, leaving the marker in place
	context.fillStyle = '#010203';
	context.fillStyle = value;
	if (context.fillStyle === '#010203') return null;
	context.fillRect(0, 0, 1, 1);
	const pixel = context.getImageData(0, 0, 1, 1).data;
	return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
};

// Stripe draws the payment box inside its own iframe, so the page's CSS (and
// dark mode) can't reach it: left alone it uses dark text, which vanishes on the
// dark card. This hands it the site's own colors for whichever theme is showing.
const buildStripeAppearance = (): Appearance => {
	const dark = document.documentElement.classList.contains('dark');
	const colors = {
		colorBackground: tokenToRgb('--background'),
		colorText: tokenToRgb('--foreground'),
		colorTextSecondary: tokenToRgb('--muted-foreground'),
		colorTextPlaceholder: tokenToRgb('--muted-foreground'),
		colorPrimary: tokenToRgb('--primary'),
	};
	const variables = Object.fromEntries(
		Object.entries(colors).filter(([, color]) => color !== null)
	);
	return { theme: dark ? 'night' : 'stripe', variables };
};

export default function AddAddressForm({
	clientSecret,
	orderTotal,
	children,
}: CheckoutFormProps) {
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};
	// create state for response
	const [responseState, setResponseState] = useState(response);
	// the payment box follows the site's light/dark theme, including when it is
	// switched while the box is open (the theme is a class on <html>)
	const [appearance, setAppearance] = useState<Appearance>();
	useEffect(() => {
		const update = () => setAppearance(buildStripeAppearance());
		update();
		const observer = new MutationObserver(update);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class'],
		});
		return () => observer.disconnect();
	}, []);
	const form = useForm<Inputs>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			address1: '',
			address2: '',
			city: '',
			state: '',
			zip: '',
		},
	});

	const handleSubmit: SubmitHandler<Inputs> = async (data: Inputs) => {
		const formData = new FormData();
		Object.entries(data).forEach(([key, value]) => {
			formData.append(key, value.toString());
		});
		// the server checks this payment belongs to the signed-in customer, then
		// attaches the address to it
		formData.append('paymentIntentId', clientSecret.split('_secret_')[0]);

		// add address to user profile and the payment
		setResponseState(await userAddAddress({}, formData));
	};

	return (
		<div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
			<div className="flex flex-col gap-6">
				{children}
				<Form {...form}>
					<Card className="w-full shadow-warm-sm">
						<CardHeader>
							<CardTitle className="text-center font-display text-2xl">
								Shipping Address
							</CardTitle>
						</CardHeader>
					<form
						className="flex flex-col gap-2"
						onSubmit={form.handleSubmit(handleSubmit)}
					>
						<CardContent className="flex flex-col gap-2">
						<FormField
							control={form.control}
							name="address1"
							render={({ field }) => {
								return (
									<FormItem>
										<FormLabel className="pl-2">Address 1</FormLabel>
										<FormControl>
											<Input placeholder="address1" type="text" {...field} />
										</FormControl>
										<FormMessage />
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
										<FormLabel className="pl-2">Address 2</FormLabel>
										<FormControl>
											<Input placeholder="address2" type="text" {...field} />
										</FormControl>
										<FormMessage />
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
										<FormLabel className="pl-2">City</FormLabel>
										<FormControl>
											<Input placeholder="city" type="text" {...field} />
										</FormControl>
										<FormMessage />
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
										<FormLabel className="pl-2">State</FormLabel>
										<FormControl>
											<Input placeholder="state" type="text" {...field} />
										</FormControl>
										<FormMessage />
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
										<FormLabel className="pl-2">Zip Code</FormLabel>
										<FormControl>
											<Input placeholder="zip" type="text" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								);
							}}
						/>
						{responseState.errors.length > 0 && (
							<p className="text-sm font-medium text-destructive" role="alert">
								{responseState.errors.join(' ')}
							</p>
						)}
						<Button type="submit" className="rounded-full">
							Add Address
						</Button>
						</CardContent>
					</form>
					</Card>
				</Form>
			</div>
			<div>
				{responseState.success ? (
					<Elements options={{ clientSecret, appearance }} stripe={stripePromise}>
						<StripeCheckoutForm orderTotal={orderTotal} />
					</Elements>
				) : (
					<Card className="w-full shadow-warm-sm">
						<CardContent className="pt-6 text-center text-muted-foreground">
							Add your shipping address to continue to payment.
						</CardContent>
					</Card>
				)}
			</div>
		</div>
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
			<Card className="w-full shadow-warm-sm">
				<CardHeader>
					<CardTitle className="font-display text-xl">
						Payment Information
					</CardTitle>
					<CardDescription className="text-destructive">
						{errorMessage && <p>{errorMessage}</p>}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<PaymentElement />
					<LinkAuthenticationElement className="mt-3" />
				</CardContent>
				<CardFooter className="flex justify-end">
					<Button
						className="rounded-full"
						disabled={stripe == null || elements == null || isLoading}
					>
						{isLoading
							? 'Purchasing...'
							: ` Purchase - ${formatCurrency(orderTotal / 100)}`}
					</Button>
				</CardFooter>
			</Card>
		</form>
	);
}
