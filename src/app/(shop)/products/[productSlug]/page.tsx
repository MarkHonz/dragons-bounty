import { notFound } from 'next/navigation';

import { verifyAuthSession } from '@/lib/auth';
import { formatCurrency } from '@/lib/formatters';
import AddToCartButton from '@/components/add-to-cart-button';
import ProductImageCarousel from '@/components/product-image-carousel';
import { getUserById } from '@/db/user-db';
import { getProductById, isProductBuyable } from '@/db/product-db';
import { ProductProps } from '@/db/product-db';
import { UserProps } from '@/db/user-db';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { hasVariants } from '@/lib/variants';

type Params = {
	params: {
		productSlug: string;
	};
};

export default async function ProductDetailPage({ params }: Params) {
	const sessionUserId = await verifyAuthSession();
	// get product by id
	const { productSlug } = params;
	const product = (await getProductById(productSlug)) as ProductProps | null;
	// a product that doesn't exist, or is switched off (or in a switched-off
	// category), is "not found" for shoppers
	if (!product || product instanceof Error || !isProductBuyable(product)) {
		notFound();
	}
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

	return (
		<div className="mx-auto max-w-[1100px] px-5 py-10 sm:px-10">
			<Card className="grid grid-cols-1 gap-8 overflow-hidden p-6 shadow-warm-sm sm:grid-cols-2 sm:p-8">
				<ProductImageCarousel
					paths={product.images.map((image) => image.path)}
					name={product.name}
				/>
				<div className="flex flex-col gap-4">
					<Badge className="w-fit">{product.category.name}</Badge>
					<h1 className="font-display text-3xl font-semibold md:text-4xl">
						{product.name}
					</h1>
					{product.artist?.artistName && (
						<p className="-mt-2 text-sm font-semibold text-muted-foreground">
							Made by {product.artist.artistName}
						</p>
					)}
					<p className="text-base leading-relaxed text-muted-foreground">
						{product.description}
					</p>
					{/* with options the price follows the chosen option, so the button shows it */}
					{!hasVariants(product) && (
						<p className="text-2xl font-extrabold">
							{formatCurrency(product.priceInCents / 100)}
						</p>
					)}
					<AddToCartButton
						cartId={
							user && user.profile.Cart !== null ? user.profile.Cart.id : 'guest'
						}
						productId={product.id}
						quantity={1}
						name={product.name}
						price={product.priceInCents}
						numberInStock={product.quantity}
						variants={product.variants}
						showPrice
					/>
				</div>
			</Card>
		</div>
	);
}
