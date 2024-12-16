'use client';

import { removeFromCart } from '@/actions/cart-actions';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

type RemoveItemProps = {
	cartId: string;
	productId: string;
};

export default function RemoveItem({
	cartId,
	productId,
}: RemoveItemProps): JSX.Element {
	// handle the remove from cart event update local storage and database
	const handleRemoveFromCart = async (
		event: React.FormEvent<HTMLFormElement>
	): Promise<void> => {
		event.preventDefault();
		// get item from local storage
		const localCartItems = JSON.parse(
			localStorage.getItem('cartItems') || '[]'
		);
		// get the cartId from localStorage
		const localCartId = localStorage.getItem('cartId') || '';

		// check if the product is in the local cart
		const productInLocalCart = localCartItems.find(
			(item: { productId: string }) => item.productId === productId
		);

		// if the cartId is not set in local storage, set it
		if (localCartId !== cartId) {
			localStorage.setItem('cartId', cartId);
		}

		// if the product is in the local cart, remove it
		if (productInLocalCart) {
			const updatedCartItems = localCartItems.filter(
				(item: { productId: string }) => item.productId !== productId
			);
			localStorage.setItem('cartItems', JSON.stringify(updatedCartItems));
		}

		if (cartId !== 'guest') {
			// remove the item from the cart in the database
			const formData = new FormData(event.currentTarget) as FormData;
			const previousState = {}; // Add appropriate previous state if needed
			await removeFromCart(previousState, formData);
		}
	};

	return (
		<form onSubmit={handleRemoveFromCart}>
			<input type="hidden" name="cartId" value={cartId} />
			<input type="hidden" name="productId" value={productId} />
			<Button type="submit" variant="outline" size="icon">
				<XCircle /* color="red" */ size={20} />
			</Button>
		</form>
	);
}
