import AddProductForm from '@/components/forms/add-product-form';
import { findActiveCategories } from '@/db/category-db';

export default async function NewProductPage() {
	const categories = await findActiveCategories();
	return (
		<main>
			<AddProductForm categories={categories} />
		</main>
	);
}
