import { searchAvailableProducts, ProductProps } from '@/db/product-db';
import ProductCard from '@/components/product-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getCartIdForSession } from '@/lib/auth';

export default async function SearchPage({
	searchParams,
}: {
	searchParams?: { q?: string };
}) {
	const query = searchParams?.q?.trim() ?? '';
	const products = query
		? ((await searchAvailableProducts(query)) as ProductProps[])
		: [];
	const cartId = await getCartIdForSession();

	return (
		<section className="mx-auto max-w-[1320px] px-5 py-10 sm:px-10">
			<h1 className="mb-7 font-display text-3xl font-semibold">
				{query ? `Results for "${query}"` : 'Search'}
			</h1>
			<form action="/search" method="GET" className="mb-8 flex max-w-md gap-3">
				<Input
					type="search"
					name="q"
					defaultValue={query}
					placeholder="Search the hoard..."
					className="rounded-full"
				/>
				<Button type="submit" className="rounded-full">
					Search
				</Button>
			</form>
			{!query ? (
				<p className="text-muted-foreground">
					Enter a search term to find treasures.
				</p>
			) : products.length > 0 ? (
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
					{products.map((product) => (
						<ProductCard key={product.id} product={product} cartId={cartId} />
					))}
				</div>
			) : (
				<p className="text-muted-foreground">
					No products found for &quot;{query}&quot;.
				</p>
			)}
		</section>
	);
}
