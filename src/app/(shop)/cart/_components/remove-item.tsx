'use client';

import { useRouter } from 'next/navigation';
import { removeFromCart } from '@/actions/cart-actions';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

type RemoveItemProps = {
	cartId: string;
	productId: string;
	// the chosen option; "" for a product without options
	variantId?: string;
};

export default function RemoveItem({
	cartId,
	productId,
	variantId = '',
}: RemoveItemProps): JSX.Element {
	const router = useRouter();
	const isGuest = cartId === 'guest';

	// handle the remove from cart event: local storage for guests, DB for authenticated users
	const handleRemoveFromCart = async (
		event: React.FormEvent<HTMLFormElement>
	): Promise<void> => {
		event.preventDefault();

		if (isGuest) {
			const localCartItems = JSON.parse(
				localStorage.getItem('cartItems') || '[]'
			);
			const updatedCartItems = localCartItems.filter(
				(item: { productId: string; variantId?: string }) =>
					!(
						item.productId === productId &&
						(item.variantId ?? '') === variantId
					)
			);
			localStorage.setItem('cartItems', JSON.stringify(updatedCartItems));
			router.refresh();
			return;
		}

		// remove the item from the cart in the database
		const formData = new FormData(event.currentTarget) as FormData;
		const previousState = {}; // Add appropriate previous state if needed
		await removeFromCart(previousState, formData);
		router.refresh();
	};

	return (
		<form onSubmit={handleRemoveFromCart}>
			<input type="hidden" name="productId" value={productId} />
			<input type="hidden" name="variantId" value={variantId} />
			<Button type="submit" variant="outline" size="icon">
				<XCircle /* color="red" */ size={20} />
			</Button>
		</form>
	);
}
