import { Button } from '@/components/ui/button';
import { getProducts, ProductProps } from '@/db/product-db';
import Link from 'next/link';
import { columns } from './_components/columns';
import { ProductTable } from './_components/product-table';
import { Card } from '@/components/ui/card';

export default async function AdminProductsPage() {
	const products = (await getProducts()) as ProductProps[];

	return (
		<main className="mx-auto max-w-5xl">
			<header className="mb-6 flex items-center justify-between gap-4">
				<h1 className="font-display text-3xl font-semibold">Products</h1>
				<Button asChild className="rounded-full">
					<Link href="/admin/products/new">Add Product</Link>
				</Button>
			</header>
			{products.length === 0 ? (
				<h2 className="p-2 text-center text-muted-foreground">
					No products found
				</h2>
			) : (
				<Card className="p-2 shadow-warm-sm">
					<ProductTable columns={columns} data={products} />
				</Card>
			)}
		</main>
	);
}
