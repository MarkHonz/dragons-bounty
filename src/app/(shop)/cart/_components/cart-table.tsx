'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import RemoveItem from './remove-item';
import { formatCurrency } from '@/lib/formatters';
import { getQuantityInStock } from '@/actions/product-actions';
import { updateCartItem } from '@/actions/cart-actions';

interface CartItem {
	productId: string;
	name: string;
	quantity: number;
	price: number;
	cartId: string;
	numberInStock?: number;
}

export default function CartTable({
	user,
	initialItems,
}: {
	user: string;
	initialItems: CartItem[] | null;
}) {
	const router = useRouter();
	const isGuest = user === 'guest';
	const cartId = React.useRef<string>('');
	const [guestCartItems, setGuestCartItems] = useState<CartItem[]>([]);

	// localStorage is only available client-side after mount; reading it during
	// the initial render (including this client component's SSR pass) throws
	useEffect(() => {
		if (!isGuest) {
			return;
		}
		cartId.current = window.localStorage.getItem('cartId') || '';
		const items: CartItem[] = JSON.parse(
			window.localStorage.getItem('cartItems') || '[]'
		);
		// show the items immediately; stock levels fill in a moment later
		setGuestCartItems(items);

		// look up stock levels client-side; authenticated users already get
		// enriched stock data server-side via initialItems
		Promise.all(
			items.map(async (item) => {
				const quantityInStock = await getQuantityInStock(item.productId);
				return { ...item, numberInStock: quantityInStock || 0 };
			})
		).then(setGuestCartItems);
	}, [isGuest]);

	const localCartItems: CartItem[] = isGuest
		? guestCartItems
		: initialItems ?? [];

	if (!isGuest) {
		cartId.current = initialItems?.[0]?.cartId || '';
	}

	// calculate the total price of the cartItems
	const totalPrice: number = localCartItems.reduce(
		(runningTotal: number, item: CartItem) => {
			return item.price * item.quantity + runningTotal;
		},
		0
	);

	const handleUpdateQuantity = async (
		event: React.FormEvent<HTMLFormElement>
	) => {
		event.preventDefault();
		const form = event.currentTarget;
		const formData = new FormData(form);
		const quantity = Number(formData.get('quantity')) || (1 as number);
		const productId = formData.get('productId') as string;
		// add cartId to the form data
		formData.append('cartId', cartId.current);

		// check if the quantity is greater than the numberInStock
		const item = localCartItems.find((item) => item.productId === productId);
		if (item && item.numberInStock && quantity > item.numberInStock) {
			alert(
				`Quantity cannot be greater than the number in stock: (${item.numberInStock})`
			);
			return;
		}

		if (isGuest) {
			// update the cart item quantity in local storage
			const cartItems = JSON.parse(
				window.localStorage.getItem('cartItems') || '[]'
			);
			const updatedCartItems = cartItems.map((item: CartItem) => {
				if (item.productId === productId) {
					item.quantity = quantity;
				}
				return item;
			});
			window.localStorage.setItem('cartItems', JSON.stringify(updatedCartItems));
			return;
		}

		// authenticated users: DB is the source of truth
		await updateCartItem({}, formData);
		router.refresh();
	};

	const quantityForm = (item: CartItem) => (
		<form onSubmit={handleUpdateQuantity} className="flex items-center gap-2">
			<input type="hidden" name="productId" value={item.productId} />
			<Input
				type="number"
				name="quantity"
				id="quantity"
				min="1"
				max={item.numberInStock}
				defaultValue={item.quantity}
				className="h-9 w-16"
			/>
			<Button type="submit" variant="outline" size="sm">
				Update
			</Button>
		</form>
	);

	return (
		// display the cart items in a table
		localCartItems.length === 0 ? (
			<p className="py-6 text-center text-muted-foreground">
				Your cart is empty
			</p>
		) : (
			<>
				<Table className="hidden sm:table">
					<TableHeader>
						<TableRow>
							<TableHead>Product</TableHead>
							<TableHead>Quantity</TableHead>
							<TableHead>Price</TableHead>
							<TableHead>Total</TableHead>
							<TableHead>Remove</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{localCartItems.map((item: CartItem) => {
							return (
								<TableRow key={item.productId}>
									<TableCell className="font-semibold">{item.name}</TableCell>
									<TableCell>{quantityForm(item)}</TableCell>
									<TableCell>{formatCurrency(item.price / 100)}</TableCell>
									<TableCell>
										{formatCurrency((item.price * item.quantity) / 100)}
									</TableCell>
									<TableCell>
										<RemoveItem
											cartId={cartId.current}
											productId={item.productId}
										/>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
				<div className="flex flex-col divide-y divide-border sm:hidden">
					{localCartItems.map((item: CartItem) => (
						<div key={item.productId} className="flex flex-col gap-3 py-4">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="font-semibold">{item.name}</p>
									<p className="text-sm text-muted-foreground">
										{formatCurrency(item.price / 100)} each
									</p>
								</div>
								<RemoveItem cartId={cartId.current} productId={item.productId} />
							</div>
							<div className="flex items-center justify-between gap-3">
								{quantityForm(item)}
								<p className="font-semibold">
									{formatCurrency((item.price * item.quantity) / 100)}
								</p>
							</div>
						</div>
					))}
				</div>
				<div className="flex flex-row justify-end w-full pt-3">
					<h2 className="font-display text-lg font-semibold">
						Cart Total: {formatCurrency(totalPrice / 100)}
					</h2>
				</div>
			</>
		)
	);
}
