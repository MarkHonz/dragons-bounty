import Image from 'next/image';
import Link from 'next/link';

import { getCoverImage, ProductProps } from '@/db/product-db';
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import AddToCartButton from '@/components/add-to-cart-button';

type ProductCardProps = {
	product: ProductProps;
	cartId: string;
};

export default function ProductCard({ product, cartId }: ProductCardProps) {
	const imageUrl = process.env.NEXT_PUBLIC_S3_BASE_URL;
	const cover = getCoverImage(product);

	return (
		<Card className="flex h-full flex-col overflow-hidden shadow-warm-sm transition-shadow hover:shadow-warm-md">
			<Link href={`/products/${product.id}`} className="flex flex-1 flex-col">
				<div className="relative">
					{cover ? (
						<Image
							src={`${imageUrl}${cover}`}
							alt={'Image of ' + product.name}
							width={320}
							height={320}
							className="aspect-square w-full object-cover"
						/>
					) : (
						<div className="flex aspect-square w-full items-center justify-center bg-muted text-sm text-muted-foreground">
							No image
						</div>
					)}
					<Badge className="absolute left-3 top-3">{product.category.name}</Badge>
				</div>
				<CardHeader className="pb-1.5">
					<CardTitle className="text-lg">{product.name}</CardTitle>
				</CardHeader>
				<CardContent className="line-clamp-2 flex-1 text-sm text-muted-foreground">
					{product.description}
				</CardContent>
			</Link>
			<CardFooter className="flex flex-col items-start gap-3 pt-2">
				<span className="text-lg font-extrabold">
					{formatCurrency(product.priceInCents / 100)}
				</span>
				<AddToCartButton
					cartId={cartId}
					productId={product.id}
					quantity={1}
					name={product.name}
					price={product.priceInCents}
					numberInStock={product.quantity}
				/>
			</CardFooter>
		</Card>
	);
}
