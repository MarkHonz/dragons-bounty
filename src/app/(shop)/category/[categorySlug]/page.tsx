import { notFound } from 'next/navigation';

import {
	getAvailableProductsByCategoryId,
	ProductProps,
} from '@/db/product-db';
import { findCategoryById, CategoryProps } from '@/db/category-db';
import ProductCard from '@/components/product-card';

type Params = {
	params: {
		categorySlug: string;
	};
};

export default async function CategoryPage({ params }: Params) {
	const { categorySlug } = params;
	const category = (await findCategoryById(categorySlug)) as CategoryProps | null;

	if (!category || !category.isActive) {
		notFound();
	}

	const products = (await getAvailableProductsByCategoryId(
		category.id
	)) as ProductProps[];

	return (
		<section className="mx-auto max-w-[1320px] px-5 py-10 sm:px-10">
			<h1
				className={`font-display text-3xl font-semibold ${
					category.description ? 'mb-1' : 'mb-7'
				}`}
			>
				{category.name}
			</h1>
			{category.description && (
				<p className="mb-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
					{category.description}
				</p>
			)}
			{products.length > 0 ? (
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{products.map((product) => (
						<ProductCard key={product.id} product={product} />
					))}
				</div>
			) : (
				<p className="text-muted-foreground">
					No products are available in this category right now.
				</p>
			)}
		</section>
	);
}
