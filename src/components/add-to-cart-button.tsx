'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { addToCart } from '@/actions/cart-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AddToCartButtonProps = {
	cartId: string;
	productId: string;
	quantity: number;
	name: string;
	price: number;
	numberInStock: number;
};

export default function AddToCartButton({
	cartId,
	productId,
	quantity,
	name,
	price,
	numberInStock,
}: AddToCartButtonProps) {
	const router = useRouter();
	const [pending, setPending] = useState(false);

	const viewCart = { label: 'View cart', onClick: () => router.push('/cart') };
	const notifyAdded = (quantityValue: string) =>
		toast.success('Added to cart', {
			description: `${quantityValue} \u00d7 ${name}`,
			action: viewCart,
		});
	const notifyAlreadyInCart = () =>
		toast('Already in your cart', { description: name, action: viewCart });

	// handle the submit event
	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const quantityValue = event.currentTarget.quantity.value;

		// authenticated users: DB is the source of truth, no localStorage involved
		if (cartId !== 'guest') {
			setPending(true);
			try {
				const formData = new FormData();
				formData.append('cartId', cartId);
				formData.append('productId', productId);
				formData.append('quantity', quantityValue);
				const result = await addToCart({}, formData);
				if (result.success) {
					notifyAdded(quantityValue);
					// the header's cart count is rendered on the server
					router.refresh();
				} else if (result.alreadyInCart) {
					notifyAlreadyInCart();
				} else {
					toast.error(result.errors[0] ?? "Couldn't add this item to your cart");
				}
			} catch (error) {
				console.error('Failed to add to cart', error);
				toast.error("Couldn't add this item to your cart");
			} finally {
				setPending(false);
			}
			return;
		}

		// guests: cart lives in localStorage only
		const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
		const localCartId = localStorage.getItem('cartId') || '';

		if (localCartId !== cartId) {
			localStorage.setItem('cartId', cartId);
		}

		const productInCart = cartItems.find(
			(item: { productId: string }) => item.productId === productId
		);
		if (productInCart) {
			notifyAlreadyInCart();
			return;
		}

		cartItems.push({
			productId,
			quantity: quantityValue,
			name,
			price,
		});
		localStorage.setItem('cartItems', JSON.stringify(cartItems));
		notifyAdded(quantityValue);
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-5">
			<div className="flex flex-row gap-5 items-center">
				<Input type="hidden" name="cartId" id="cartId" defaultValue={cartId} />
				<Input type="hidden" name="productId" defaultValue={productId} />
				<Label htmlFor="quantity">Quantity</Label>
				<Input
					type="number"
					name="quantity"
					defaultValue={quantity}
					min="1"
					max={numberInStock}
					className="max-w-14"
				/>
				<p>In Stock:&nbsp;{numberInStock}</p>
			</div>
			<Button type="submit" size={'sm'} className="max-w-56" disabled={pending}>
				{pending ? 'Adding\u2026' : 'Add to Cart'}
			</Button>
		</form>
	);
}
