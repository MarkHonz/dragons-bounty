'use server';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { MoreVertical } from 'lucide-react';
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
		<main className="mx-auto max-w-2xl">
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
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-0">Active</TableHead>
								<TableHead>Name</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{categories.map((category) => {
								return (
									<TableRow key={category.id}>
										<TableCell>
											<Badge variant={category.isActive ? 'secondary' : 'outline'}>
												{category.isActive ? 'Active' : 'Inactive'}
											</Badge>
										</TableCell>
										<TableCell>{category.name}</TableCell>
										<TableCell>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" className="h-8 w-8 p-0">
														<span className="sr-only">Open menu</span>
														<MoreVertical className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
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
				</Card>
			)}
		</main>
	);
}
