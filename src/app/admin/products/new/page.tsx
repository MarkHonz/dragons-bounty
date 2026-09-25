import AddProductForm from '@/components/forms/add-product-form';
import { findActiveCategories } from '@/db/category-db';
import { getArtists } from '@/db/artist-db';

export default async function NewProductPage() {
	const [categories, artists] = await Promise.all([
		findActiveCategories(),
		getArtists(),
	]);
	return (
		<main className="mx-auto max-w-md">
			<AddProductForm categories={categories} artists={artists} />
		</main>
	);
}
