import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

import { DataTable } from '@/components/data-table';
import { columns } from './_components/columns';
import { CategoryProps, getCategories } from '@/db/category-db';

export default async function CategoryPage() {
	const categories = (await getCategories()) as CategoryProps[];
	return (
		<main className="mx-auto max-w-3xl">
			<header className="mb-6 flex items-center justify-between gap-4">
				<h1 className="font-display text-3xl font-semibold">Categories</h1>
				<Button asChild className="rounded-full">
					<Link href="/admin/category/new">Add Category</Link>
				</Button>
			</header>
			{categories.length === 0 ? (
				<p className="p-2 text-center text-muted-foreground">
					No categories found
				</p>
			) : (
				<Card className="p-2 shadow-warm-sm">
					<DataTable
						columns={columns}
						data={categories}
						searchColumns={['name', 'description']}
						searchPlaceholder="Search by name or description"
					/>
				</Card>
			)}
		</main>
	);
}
