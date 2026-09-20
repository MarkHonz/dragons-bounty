import DiscountCodeForm from '@/components/forms/discount-code-form';
import { getDiscountCodeById } from '@/db/discount-db';

export default async function EditDiscountPage({
	params,
}: {
	params: { discountId: string };
}) {
	const code = await getDiscountCodeById(params.discountId);

	return (
		<main className="mx-auto max-w-md">
			{code ? (
				<DiscountCodeForm code={code} />
			) : (
				<p className="text-center text-muted-foreground">Code not found</p>
			)}
		</main>
	);
}
