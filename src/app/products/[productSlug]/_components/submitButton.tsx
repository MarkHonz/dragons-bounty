'use client';

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

export default function SubmitButton({
	cartId,
	productId,
	quantity,
	name,
	price,
	numberInStock,
}: AddToCartButtonProps) {
	// handle the submit event
	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		// get the cartItems from localStorage
		const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
		// get the cartId from localStorage
		let localCartId = localStorage.getItem('cartId') || '';

		// check if the product is already in the cart
		const productInCart = cartItems.find(
			(item: { productId: string }) => item.productId === productId
		);

		// set cartId to local storage if it is not already set
		if (localCartId !== cartId) {
			localStorage.setItem('cartId', cartId);
			localCartId = cartId;
		}

		// if the product is not already in the cart, add it
		if (productInCart) {
			return;
		} else {
			// add the cartId and productId to the cartItems array
			cartItems.push({
				productId,
				quantity: event.currentTarget.quantity.value,
				name,
				price,
			});
			// store the cartItems in localStorage
			localStorage.setItem('cartItems', JSON.stringify(cartItems));
		}
		// if the user is authenticated and the product is not in the cart
		if (!productInCart && cartId !== 'guest') {
			// add the product to the cart in the database
			const formData = new FormData();
			formData.append('cartId', cartId);
			formData.append('productId', productId);
			formData.append('quantity', event.currentTarget.quantity.value);
			await addToCart({}, formData);
		}
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
			{/* <button type="submit" className="btn btn-primary bg-cyan-500"> */}
			<Button type="submit" size={'sm'} className="max-w-56">
				Add to Cart
			</Button>
			{/* </button> */}
		</form>
	);
}
