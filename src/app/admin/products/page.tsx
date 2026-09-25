import { Button } from '@/components/ui/button';
import { getProducts, ProductProps } from '@/db/product-db';
import Link from 'next/link';
import { columns } from './_components/columns';
import { DataTable } from '@/components/data-table';
import { Card } from '@/components/ui/card';
import FilterTabs from '@/components/filter-tabs';
import { cn } from '@/lib/utils';
import {
	countStock,
	matchesStockFilter,
	parseStockFilter,
	StockFilter,
} from '@/lib/stock';

type Props = {
	searchParams: { stock?: string; available?: string };
};

// A link's query string for a given combination of the two filters, so every
// tab and the toggle keep whichever other filter is active when clicked.
const buildHref = ({
	stock,
	available,
}: {
	stock?: StockFilter;
	available: boolean;
}) => {
	const params = new URLSearchParams();
	if (stock) params.set('stock', stock);
	if (available) params.set('available', '1');
	const query = params.toString();
	return query ? `/admin/products?${query}` : '/admin/products';
};

export default async function AdminProductsPage({ searchParams }: Props) {
	const allProducts = (await getProducts()) as ProductProps[];
	const stock = parseStockFilter(searchParams.stock);
	const availableOnly = searchParams.available === '1';

	// the stock tabs' own counts and results are scoped to "available only"
	// when that toggle is on, so they never count a hidden product
	const scoped = availableOnly
		? allProducts.filter((product) => product.isAvailable)
		: allProducts;
	const counts = countStock(scoped);
	const products = stock ? scoped.filter((product) => matchesStockFilter(product)) : scoped;
	// the toggle's own count is always the total, so it doesn't jump around
	// as the stock tab changes
	const availableCount = allProducts.filter((p) => p.isAvailable).length;

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
					<div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
						<FilterTabs
							label="Filter products by stock"
							options={[
								{
									label: 'All',
									href: buildHref({ available: availableOnly }),
									count: counts.all,
									active: !stock,
								},
								{
									label: 'Sold out',
									href: buildHref({ stock: 'out', available: availableOnly }),
									count: counts.out,
									active: stock === 'out',
								},
							]}
						/>
						{/* independent of the stock tabs, so it can combine with any of them */}
						<Link
							href={buildHref({ stock, available: !availableOnly })}
							aria-pressed={availableOnly}
							className={cn(
								'flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
								availableOnly
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
							)}
						>
							Available only
							<span
								className={cn(
									'text-xs',
									availableOnly ? 'text-primary-foreground/80' : 'text-muted-foreground'
								)}
							>
								{availableCount}
							</span>
						</Link>
					</div>
					<Card className="p-2 shadow-warm-sm">
						<DataTable
							// a new filter starts the table fresh (search, sort and page)
							key={`${stock ?? 'all'}-${availableOnly}`}
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
