import EditProductForm from '@/components/forms/edit-product-form';
import { findActiveCategories } from '@/db/category-db';
import { getProductById } from '@/db/product-db';
import { /* UpdateProductProps, */ ProductProps } from '@/db/product-db';

type EditProductPageProps = {
	params: {
		productSlug: string;
	};
};

export default async function EditProductPage({
	params,
}: EditProductPageProps) {
	const { productSlug } = params;
	const product = (await getProductById(productSlug)) as ProductProps;
	const categories = await findActiveCategories();

	return (
		<main>
			{product ? (
				<EditProductForm product={product} categories={categories} />
			) : (
				<p>Product not found</p>
			)}
		</main>
	);
}
