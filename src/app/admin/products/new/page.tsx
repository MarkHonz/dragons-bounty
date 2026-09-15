import AddProductForm from '@/components/forms/add-product-form';
import { findActiveCategories } from '@/db/category-db';

export default async function NewProductPage() {
	const categories = await findActiveCategories();
	return (
		<main className="mx-auto max-w-md">
			<AddProductForm categories={categories} />
		</main>
	);
}
