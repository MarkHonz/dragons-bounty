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
		const quantityValue = event.currentTarget.quantity.value;

		// authenticated users: DB is the source of truth, no localStorage involved
		if (cartId !== 'guest') {
			const formData = new FormData();
			formData.append('cartId', cartId);
			formData.append('productId', productId);
			formData.append('quantity', quantityValue);
			await addToCart({}, formData);
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
			return;
		}

		cartItems.push({
			productId,
			quantity: quantityValue,
			name,
			price,
		});
		localStorage.setItem('cartItems', JSON.stringify(cartItems));
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
