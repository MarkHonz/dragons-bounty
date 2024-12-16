import Image from 'next/image';

import { verifyAuthSession } from '@/lib/auth';
import { formatCurrency } from '@/lib/formatters';
import SubmitButton from './_components/submitButton';
import { getUserById } from '@/db/user-db';
import { getProductById } from '@/db/product-db';
import { getCartById } from '@/db/cart-db';
import { ProductProps } from '@/db/product-db';
import { UserProps } from '@/db/user-db';
import { CartProps } from '@/db/cart-db';

type Params = {
	params: {
		productSlug: string;
	};
};

export default async function ProductDetailPage({ params }: Params) {
	const sessionUserId = await verifyAuthSession();
	// get product by id
	const { productSlug } = params;
	const product = (await getProductById(productSlug)) as ProductProps;
	// get user by id
	let authenticatedUser = '';

	if (sessionUserId.user !== null) {
		authenticatedUser = sessionUserId.user.id;
	} else {
		authenticatedUser = 'guest';
	}

	let user: UserProps | null = null;
	if (authenticatedUser !== 'guest') {
		user = (await getUserById(authenticatedUser)) as UserProps;
	} else {
		user = null;
	}
	// console.log('user', user);

	const imageUrl = 'https://dragon-gate-s3-test.s3.us-east-2.amazonaws.com/';

	const cart = (await getCartById(
		user && user.profile.Cart !== null ? user.profile.Cart.id : 'guest'
	)) as CartProps[];
	console.log('cart', cart);

	return (
		<div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
			<div className="flex justify-center">
				<Image
					src={`${imageUrl}${product.imagePath}`}
					alt={'Image of ' + product.name}
					width={300}
					height={300}
					className="rounded-md w-auto h-auto"
					priority
				/>
			</div>
			<div className="flex flex-col gap-5">
				<h1 className="text-4xl">{product.name}</h1>
				<p className="text-lg">{product.description}</p>
				<p className="text-2xl font-semibold">
					{formatCurrency(product.priceInCents / 100)}
				</p>
				<SubmitButton
					cartId={
						user && user.profile.Cart !== null ? user.profile.Cart.id : 'guest'
					}
					productId={product.id}
					quantity={1}
					name={product.name}
					price={product.priceInCents}
					numberInStock={product.quantity}
				/>
			</div>
		</div>
	);
}
