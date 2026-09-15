import Image from 'next/image';

import { verifyAuthSession } from '@/lib/auth';
import { formatCurrency } from '@/lib/formatters';
import SubmitButton from './_components/submitButton';
import { getUserById } from '@/db/user-db';
import { getProductById } from '@/db/product-db';
import { ProductProps } from '@/db/product-db';
import { UserProps } from '@/db/user-db';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

	const imageUrl = process.env.NEXT_PUBLIC_S3_BASE_URL;

	return (
		<div className="mx-auto max-w-[1100px] px-5 py-10 sm:px-10">
			<Card className="grid grid-cols-1 gap-8 overflow-hidden p-6 shadow-warm-sm sm:grid-cols-2 sm:p-8">
				<div className="flex items-center justify-center overflow-hidden rounded-2xl bg-muted">
					<Image
						src={`${imageUrl}${product.imagePath}`}
						alt={'Image of ' + product.name}
						width={400}
						height={400}
						className="h-auto w-full max-w-sm object-contain"
						priority
					/>
				</div>
				<div className="flex flex-col gap-4">
					<Badge className="w-fit">{product.category.name}</Badge>
					<h1 className="font-display text-3xl font-semibold md:text-4xl">
						{product.name}
					</h1>
					<p className="text-base leading-relaxed text-muted-foreground">
						{product.description}
					</p>
					<p className="text-2xl font-extrabold">
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
			</Card>
		</div>
	);
}
