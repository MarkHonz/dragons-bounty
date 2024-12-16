'use server';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { CheckCircle2, MoreVertical, XCircle } from 'lucide-react';
// import { formatCurrency, formatNumber } from "@/lib/formatters"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import CategoryDelete from './_components/category-delete';
import CategoryToggleActive from './_components/category-toggle-active';
import { getCategories } from '@/db/category-db';

export default async function CategoryPage() {
	const categories = await getCategories();
	return (
		<main className=" max-w-lg m-auto">
			<header className="flex justify-between items-center gap-4">
				<h1 className="text-4xl mb-4 p-3">Categories</h1>
				<Button asChild>
					<Link href="/admin/category/new">Add Category</Link>
				</Button>
			</header>
			{categories.length === 0 ? (
				<p>No categories found</p>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-0">
								{/* <span className="sr-only">Available For Purchase</span> */}
								Active
							</TableHead>
							<TableHead>Name</TableHead>
							{/* <TableHead>Products</TableHead> */}
							<TableHead>Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{categories.map((category) => {
							return (
								<TableRow key={category.id}>
									<TableCell>
										{category.isActive ? <CheckCircle2 /> : <XCircle />}
									</TableCell>
									<TableCell>{category.name}</TableCell>
									{/* <TableCell>{category.products.length}</TableCell> */}
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger>
												<MoreVertical />
											</DropdownMenuTrigger>
											<DropdownMenuContent>
												<Link href={`/admin/category/${category.id}/edit`}>
													<DropdownMenuItem>Edit</DropdownMenuItem>
												</Link>
												<CategoryToggleActive category={category} />
												<DropdownMenuSeparator />
												<CategoryDelete id={category.id} />
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			)}
		</main>
	);
}
