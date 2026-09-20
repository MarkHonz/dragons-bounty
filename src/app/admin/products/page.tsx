import { Button } from '@/components/ui/button';
import { getProducts, ProductProps } from '@/db/product-db';
import Link from 'next/link';
import { columns } from './_components/columns';
import { DataTable } from '@/components/data-table';
import { Card } from '@/components/ui/card';
import FilterTabs from '@/components/filter-tabs';
import { countStock, matchesStockFilter, parseStockFilter } from '@/lib/stock';

type Props = {
	searchParams: { stock?: string };
};

export default async function AdminProductsPage({ searchParams }: Props) {
	const allProducts = (await getProducts()) as ProductProps[];
	const stock = parseStockFilter(searchParams.stock);
	const counts = countStock(allProducts);
	const products = stock
		? allProducts.filter((product) => matchesStockFilter(product, stock))
		: allProducts;

	return (
		<main className="mx-auto max-w-5xl">
			<header className="mb-6 flex items-center justify-between gap-4">
				<h1 className="font-display text-3xl font-semibold">Products</h1>
				<Button asChild className="rounded-full">
					<Link href="/admin/products/new">Add Product</Link>
				</Button>
			</header>
			{allProducts.length === 0 ? (
				<h2 className="p-2 text-center text-muted-foreground">
					No products found
				</h2>
			) : (
				<>
					<FilterTabs
						label="Filter products by stock"
						options={[
							{ label: 'All', href: '/admin/products', count: counts.all, active: !stock },
							{
								label: 'Low stock',
								href: '/admin/products?stock=low',
								count: counts.low,
								active: stock === 'low',
							},
							{
								label: 'Sold out',
								href: '/admin/products?stock=out',
								count: counts.out,
								active: stock === 'out',
							},
						]}
					/>
					<Card className="p-2 shadow-warm-sm">
						<DataTable
							// a new filter starts the table fresh (search, sort and page)
							key={stock ?? 'all'}
							columns={columns}
							data={products}
							searchColumns={['name', 'category.name']}
							searchPlaceholder="Search by name or category"
						/>
					</Card>
				</>
			)}
		</main>
	);
}
