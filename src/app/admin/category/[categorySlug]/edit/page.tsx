import EditCategoryForm from '@/components/forms/edit-category-form';
import { findCategoryById } from '@/db/category-db';

type EditCategoryPageProps = {
	params: {
		categorySlug: string;
	};
};

export default async function EditCategoryPage({
	params,
}: EditCategoryPageProps) {
	const { categorySlug } = params;
	const category = await findCategoryById(categorySlug);

	return (
		<main className="mx-auto max-w-md">
			{category ? (
				<EditCategoryForm category={category} />
			) : (
				<p className="text-center text-muted-foreground">Category not found</p>
			)}
		</main>
	);
}
