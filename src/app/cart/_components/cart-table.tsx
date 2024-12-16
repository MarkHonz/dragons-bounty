'use client';

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import RemoveItem from './remove-item';
import { formatCurrency } from '@/lib/formatters';

interface CartItem {
	productId: string;
	name: string;
	quantity: number;
	price: number;
	cartId: string;
}

export default function CartTable() {
	// get the cart items from local storage
	const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
	// get the cartId from localStorage
	const cartId = localStorage.getItem('cartId') || '';
	// calculate the total price of the cartItems
	const totalPrice: number = cartItems.reduce((acc: number, item: CartItem) => {
		return acc + item.price;
	}, 0);
	console.log(totalPrice);

	return (
		// display the cart items in a table
		cartItems.length === 0 ? (
			<p>Your cart is empty</p>
		) : (
			<>
				<Table>
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
						{cartItems.map((item: CartItem) => {
							return (
								<TableRow key={item.productId}>
									<TableCell>{item.name}</TableCell>
									<TableCell>{item.quantity}</TableCell>
									<TableCell>{formatCurrency(item.price / 100)}</TableCell>
									<TableCell>
										{formatCurrency((item.price * item.quantity) / 100)}
									</TableCell>
									<TableCell>
										<RemoveItem cartId={cartId} productId={item.productId} />
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
				<div className="flex flex-row justify-end w-full pt-3">
					<h2>Cart Total: {formatCurrency(totalPrice / 100)}</h2>
				</div>
			</>
		)
	);
}
