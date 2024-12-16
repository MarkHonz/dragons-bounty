import { Button } from '@/components/ui/button';
import { getProducts, ProductProps } from '@/db/product-db';
import Link from 'next/link';
import { columns } from './_components/columns';
import { ProductTable } from './_components/product-table';

export default async function AdminProductsPage() {
	const products: ProductProps[] = (await getProducts()) as ProductProps[];

	return (
		<main className=" max-w-xl m-auto">
			<header className="flex justify-between items-center gap-4">
				<h1 className="text-4xl mb-4 p-3">Products</h1>
				<Button asChild>
					<Link href="/admin/products/new">Add Product</Link>
				</Button>
			</header>
			{products.length === 0 ? (
				<h2 className="text-center p-2">No products found</h2>
			) : (
				<ProductTable columns={columns} data={products} />
			)}
		</main>
	);
}
