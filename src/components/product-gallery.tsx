import Link from 'next/link';
import Image from 'next/image';
import {
	getAvailableProducts,
	getCoverImage,
	ProductProps,
} from '@/db/product-db';

export default async function ProductGallery() {
	const imageUrl = process.env.NEXT_PUBLIC_S3_BASE_URL;
	const products = ((await getAvailableProducts()) as ProductProps[]).filter(
		(product) => getCoverImage(product)
	);

	if (products.length === 0) {
		return null;
	}

	return (
		<section
			id="gallery"
			className="mx-auto max-w-[1320px] scroll-mt-24 px-5 py-14 sm:px-10"
		>
			<div className="mx-auto mb-9 max-w-xl text-center">
				<h2 className="mb-2.5 font-display text-3xl font-semibold">Gallery</h2>
				<p className="text-muted-foreground">
					A look inside the shop, the hoard, and the dragon who guards it.
				</p>
			</div>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
				{products.map((product) => (
					<Link
						key={product.id}
						href={`/products/${product.id}`}
						className="overflow-hidden rounded-2xl border border-border bg-muted shadow-warm-sm"
					>
						<Image
							src={`${imageUrl}${getCoverImage(product)}`}
							alt={product.name}
							width={320}
							height={320}
							className="h-40 w-full object-cover"
						/>
					</Link>
				))}
			</div>
		</section>
	);
}
