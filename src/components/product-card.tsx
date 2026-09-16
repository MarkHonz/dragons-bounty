import Image from 'next/image';
import Link from 'next/link';

import { ProductProps } from '@/db/product-db';
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';

export default function ProductCard({ product }: { product: ProductProps }) {
	const imageUrl = process.env.NEXT_PUBLIC_S3_BASE_URL;

	return (
		<Link href={`/products/${product.id}`}>
			<Card className="flex h-full flex-col overflow-hidden shadow-warm-sm transition-shadow hover:shadow-warm-md">
				<div className="relative">
					<Image
						src={`${imageUrl}${product.imagePath}`}
						alt={'Image of ' + product.name}
						width={320}
						height={320}
						className="aspect-square w-full object-cover"
					/>
					<Badge className="absolute left-3 top-3">{product.category.name}</Badge>
				</div>
				<CardHeader className="pb-1.5">
					<CardTitle className="text-lg">{product.name}</CardTitle>
				</CardHeader>
				<CardContent className="line-clamp-2 flex-1 text-sm text-muted-foreground">
					{product.description}
				</CardContent>
				<CardFooter className="pt-2 text-lg font-extrabold">
					{formatCurrency(product.priceInCents / 100)}
				</CardFooter>
			</Card>
		</Link>
	);
}
