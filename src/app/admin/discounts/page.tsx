import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { getDiscountCodes } from '@/db/discount-db';
import { columns } from './_components/columns';

export default async function DiscountsPage() {
	const codes = await getDiscountCodes();
	return (
		<main className="mx-auto max-w-3xl">
			<header className="mb-6 flex items-center justify-between gap-4">
				<h1 className="font-display text-3xl font-semibold">Discount Codes</h1>
				<Button asChild className="rounded-full">
					<Link href="/admin/discounts/new">Add Code</Link>
				</Button>
			</header>
			{codes.length === 0 ? (
				<p className="p-2 text-center text-muted-foreground">
					No discount codes yet
				</p>
			) : (
				<Card className="p-2 shadow-warm-sm">
					<DataTable
						columns={columns}
						data={codes}
						searchColumns={['code']}
						searchPlaceholder="Search by code"
					/>
				</Card>
			)}
		</main>
	);
}
