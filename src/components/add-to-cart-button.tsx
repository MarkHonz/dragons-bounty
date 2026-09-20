'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { addToCart } from '@/actions/cart-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/formatters';
import {
	formatVariantLabel,
	getPriceRange,
	variantPrice,
	VariantProps,
} from '@/lib/variants';

type AddToCartButtonProps = {
	cartId: string;
	productId: string;
	quantity: number;
	name: string;
	price: number;
	// null when stock isn't tracked; ignored for a product with options
	numberInStock: number | null;
	// the product's options; leave out (or empty) for a product without any
	variants?: VariantProps[];
	// also show the price here (needed with options, because it follows the choice)
	showPrice?: boolean;
};

export default function AddToCartButton({
	cartId,
	productId,
	quantity,
	name,
	price,
	numberInStock,
	variants = [],
	showPrice = false,
}: AddToCartButtonProps) {
	const router = useRouter();
	const [pending, setPending] = useState(false);
	const [variantId, setVariantId] = useState('');
	// several of these render on one page, so each needs its own id to tie the
	// label to its input
	const quantityId = useId();
	const optionId = useId();

	const hasOptions = variants.length > 0;
	const chosen = variants.find((variant) => variant.id === variantId);
	const label = formatVariantLabel(name, chosen?.name);
	const unitPrice = variantPrice(price, chosen);
	// with options, stock is the chosen option's and unknown until one is chosen
	const stock = hasOptions ? (chosen ? chosen.quantity : null) : numberInStock;

	const viewCart = { label: 'View cart', onClick: () => router.push('/cart') };
	const notifyAdded = (quantityValue: string) =>
		toast.success('Added to cart', {
			description: `${quantityValue} × ${label}`,
			action: viewCart,
		});
	const notifyAlreadyInCart = () =>
		toast('Already in your cart', { description: label, action: viewCart });

	// handle the submit event
	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const quantityValue = event.currentTarget.quantity.value;

		if (hasOptions && !chosen) {
			toast('Please choose an option');
			return;
		}

		// authenticated users: DB is the source of truth, no localStorage involved
		if (cartId !== 'guest') {
			setPending(true);
			try {
				const formData = new FormData();
				formData.append('productId', productId);
				formData.append('variantId', chosen?.id ?? '');
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
			(item: { productId: string; variantId?: string }) =>
				item.productId === productId &&
				(item.variantId ?? '') === (chosen?.id ?? '')
		);
		if (productInCart) {
			notifyAlreadyInCart();
			return;
		}

		cartItems.push({
			productId,
			variantId: chosen?.id ?? '',
			variantName: chosen?.name ?? '',
			quantity: quantityValue,
			name,
			price: unitPrice,
		});
		localStorage.setItem('cartItems', JSON.stringify(cartItems));
		notifyAdded(quantityValue);
	};

	// nothing to add: show a disabled button instead of the quantity box
	const soldOut = hasOptions
		? variants.every((variant) => variant.quantity <= 0)
		: numberInStock != null && numberInStock <= 0;
	if (soldOut) {
		return (
			<Button type="button" size={'sm'} className="max-w-56" disabled>
				Sold out
			</Button>
		);
	}

	const range = getPriceRange({ priceInCents: price, variants });
	const priceText = chosen
		? formatCurrency(unitPrice / 100)
		: range.min === range.max
			? formatCurrency(range.min / 100)
			: `From ${formatCurrency(range.min / 100)}`;

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-5">
			{hasOptions && showPrice && (
				<p className="text-2xl font-extrabold">{priceText}</p>
			)}
			{hasOptions && (
				<div className="flex flex-col gap-1.5">
					<Label htmlFor={optionId}>Option</Label>
					<select
						id={optionId}
						value={variantId}
						onChange={(event) => setVariantId(event.target.value)}
						className="h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					>
						<option value="">Choose an option</option>
						{variants.map((variant) => {
							const differs = variantPrice(price, variant) !== price;
							return (
								<option
									key={variant.id}
									value={variant.id}
									disabled={variant.quantity <= 0}
								>
									{variant.name}
									{differs && ` — ${formatCurrency(variantPrice(price, variant) / 100)}`}
									{variant.quantity <= 0 && ' (sold out)'}
								</option>
							);
						})}
					</select>
				</div>
			)}
			<div className="flex flex-row gap-5 items-center">
				<Input type="hidden" name="productId" defaultValue={productId} />
				<Label htmlFor={quantityId}>Quantity</Label>
				<Input
					type="number"
					id={quantityId}
					name="quantity"
					defaultValue={quantity}
					min="1"
					max={stock ?? undefined}
					className="max-w-14"
				/>
				{stock != null && <p>In Stock:&nbsp;{stock}</p>}
			</div>
			<Button
				type="submit"
				size={'sm'}
				className="max-w-56"
				disabled={pending || (hasOptions && !chosen)}
			>
				{pending ? 'Adding…' : 'Add to Cart'}
			</Button>
			{hasOptions && !chosen && (
				<p className="-mt-2 text-sm text-muted-foreground">
					Choose an option to add this to your cart.
				</p>
			)}
		</form>
	);
}
