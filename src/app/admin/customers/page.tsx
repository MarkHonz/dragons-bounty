'use server';

import React from 'react';
import Link from 'next/link';
import { getUsersPaginated } from '@/db/user-db';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';

export default async function AdminCustomersPage({
	searchParams,
}: {
	searchParams?: { page?: string };
}) {
	const page = Math.max(1, parseInt(searchParams?.page ?? '1', 10) || 1);
	const perPage = 10;
	const { users, total } = await getUsersPaginated(page, perPage);
	const totalPages = Math.max(1, Math.ceil(total / perPage));

	return (
		<main className="mx-auto max-w-5xl">
			<header className="mb-6 flex items-center justify-between gap-4">
				<h1 className="font-display text-3xl font-semibold">Customers</h1>
			</header>

			{users && users.length > 0 ? (
				<>
					<Card className="overflow-x-auto p-2 shadow-warm-sm">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Email</TableHead>
									<TableHead>Cart ID</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{users.map((user) => (
									<TableRow key={user.id}>
										<TableCell className="break-words">
											{user.profile?.name ?? '—'}
										</TableCell>
										<TableCell className="break-words">{user.email}</TableCell>
										<TableCell className="break-words text-muted-foreground">
											{user.profile?.Cart?.id ?? '—'}
										</TableCell>
										<TableCell className="text-right">
											<Link
												href={`/admin/customers/${user.id}`}
												className="text-sm font-semibold text-primary"
											>
												View
											</Link>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</Card>
					<div className="mt-4 flex items-center justify-between">
						<div className="text-sm text-muted-foreground">
							Page {page} of {totalPages}
						</div>
						<div className="flex gap-2">
							<Button
								asChild={page > 1}
								disabled={page <= 1}
								variant="outline"
								size="sm"
								className="rounded-full"
							>
								{page > 1 ? (
									<Link href={`/admin/customers?page=${page - 1}`}>
										Previous
									</Link>
								) : (
									<span>Previous</span>
								)}
							</Button>
							<Button
								asChild={page < totalPages}
								disabled={page >= totalPages}
								variant="outline"
								size="sm"
								className="rounded-full"
							>
								{page < totalPages ? (
									<Link href={`/admin/customers?page=${page + 1}`}>Next</Link>
								) : (
									<span>Next</span>
								)}
							</Button>
						</div>
					</div>
				</>
			) : (
				<Card className="p-6 text-center text-muted-foreground shadow-warm-sm">
					No customers found.
				</Card>
			)}
		</main>
	);
}
