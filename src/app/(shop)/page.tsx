import {
	getAvailableProductsByCategoryId,
	ProductProps,
} from '@/db/product-db';
import { CategoryProps } from '@/db/category-db';
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { getCategories } from '@/db/category-db';
import Link from 'next/link';
import { formatCurrency } from '@/lib/formatters';
import { CheckCircle } from 'lucide-react';
import PhotoGallery from '@/components/photo-gallery';

export default async function HomePage() {
	const categories = (await getCategories()) as CategoryProps[];
	const imageUrl = process.env.NEXT_PUBLIC_S3_BASE_URL;

	const categoryProducts = await Promise.all(
		categories.map(async (category) => {
			const products = (await getAvailableProductsByCategoryId(
				category.id
			)) as ProductProps[];
			return { categoryId: category.id, products };
		})
	);

	return (
		<div>
			<section className="mx-auto grid max-w-[1320px] grid-cols-1 items-center gap-12 px-5 py-16 sm:px-10 md:grid-cols-2 md:gap-16 md:py-20">
				<div>
					<div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-muted px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-secondary">
						Curated by a Dragon
					</div>
					<h1 className="mb-5 font-display text-4xl font-semibold leading-[1.1] md:text-5xl">
						Treasure Worth the Quest
					</h1>
					<p className="mb-8 max-w-md text-lg leading-relaxed text-muted-foreground">
						Potions, blades, and armor gathered from the far corners of the
						realm &mdash; plus a dragon who insists on quality control.
					</p>
					<div className="mb-9 flex flex-wrap items-center gap-4">
						<Link
							href="#gallery"
							className="rounded-full bg-primary px-7 py-3.5 text-sm font-extrabold text-primary-foreground shadow-warm-md"
						>
							Shop the Hoard
						</Link>
						<Link
							href="#gallery"
							className="rounded-full border border-border px-7 py-3.5 text-sm font-bold"
						>
							View Gallery
						</Link>
					</div>
					<div className="flex flex-wrap items-center gap-6">
						{['Handcrafted Goods', 'Secure Checkout', 'Guild-Backed Quality'].map(
							(label) => (
								<div
									key={label}
									className="flex items-center gap-2 text-xs font-bold text-muted-foreground"
								>
									<CheckCircle className="h-4 w-4 text-secondary" />
									{label}
								</div>
							)
						)}
					</div>
				</div>
				<div className="relative">
					<div className="overflow-hidden rounded-3xl border border-border shadow-warm-md">
						<Image
							src="/images/dragon-wide.png"
							alt="A dragon curled up asleep on a pile of yarn balls"
							width={1100}
							height={515}
							className="h-auto w-full"
							priority
						/>
					</div>
					<div className="absolute -bottom-4 -left-4 hidden items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-3 shadow-warm-md sm:flex">
						<span className="text-sm font-extrabold text-foreground">
							Guild Favorite
						</span>
					</div>
				</div>
			</section>

			<div className="mx-auto flex max-w-[1320px] flex-wrap gap-3 px-5 pb-2 sm:px-10">
				<Badge className="px-5 py-2 text-sm">All Goods</Badge>
				{categories.map((category) => (
					<Badge
						key={category.id}
						variant="outline"
						className="border-border bg-card px-5 py-2 text-sm font-bold text-foreground"
					>
						{category.name}
					</Badge>
				))}
			</div>

			{categories.map((category) => (
				<section
					key={category.id}
					id={category.id}
					className="mx-auto max-w-[1320px] scroll-mt-24 px-5 py-10 sm:px-10"
				>
					<h2 className="mb-7 font-display text-3xl font-semibold">
						{category.name}
					</h2>
					<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{categoryProducts
							.find((cp) => cp.categoryId === category.id)
							?.products.map((product) => (
								<Link key={product.id} href={`/products/${product.id}`}>
									<Card className="flex h-full flex-col overflow-hidden shadow-warm-sm transition-shadow hover:shadow-warm-md">
										<div className="relative">
											<Image
												src={`${imageUrl}${product.imagePath}`}
												alt={'Image of ' + product.name}
												width={320}
												height={320}
												className="aspect-square w-full object-cover"
											/>
											<Badge className="absolute left-3 top-3">
												{product.category.name}
											</Badge>
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
							))}
					</div>
				</section>
			))}

			<PhotoGallery />
		</div>
	);
}
