// import styles from './page.module.scss';
import { getUsers } from '@/db/user-db';
import DeleteButton from '@/components/delete-button';
import {
	// getProductById, getProducts,
	getProductsByCategoryId,
} from '@/db/product-db';
import { ProductProps } from '@/db/product-db';
import { CategoryProps } from '@/db/category-db';
import {
	Card,
	CardContent,
	// CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import Image from 'next/image';
import { getCategories } from '@/db/category-db';
import Link from 'next/link';

export default async function HomePage() {
	const users = await getUsers();
	// const products = (await getProducts()) as ProductProps[];
	const categories = (await getCategories()) as CategoryProps[];
	const imageUrl = 'https://dragon-gate-s3-test.s3.us-east-2.amazonaws.com/';

	const categoryProducts = await Promise.all(
		categories.map(async (category) => {
			const products = (await getProductsByCategoryId(
				category.id
			)) as ProductProps[];
			return { categoryId: category.id, products };
		})
	);

	return (
		<div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
			<main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
				{categories &&
					categories.map((category) => {
						return (
							<div key={category.id}>
								<h2 className="text-4xl p-3">{category.name}</h2>
								<div className="grid grid-cols-3 gap-5">
									{categoryProducts
										.find((cp) => cp.categoryId === category.id)
										?.products.map((product) => {
											return (
												<Link key={product.id} href={`/products/${product.id}`}>
													<Card key={product.id}>
														<Image
															src={`${imageUrl}${product.imagePath}`}
															alt={'Image of ' + product.name}
															width={150}
															height={150}
															className="rounded-md pt-3 m-auto h-auto w-auto"
														/>
														<CardHeader>
															<CardTitle>{product.name}</CardTitle>
															{/* <CardDescription></CardDescription> */}
														</CardHeader>
														<CardContent>
															<p>{product.description}</p>
															<p>{product.priceInCents}</p>
														</CardContent>
														<CardFooter>{product.category.name}</CardFooter>
													</Card>
												</Link>
											);
										})}
								</div>
							</div>
						);
					})}
				{users &&
					users.map((user) => {
						return (
							<div key={user.id}>
								<h3 key={user.id}>{`Name: ${
									user.profile?.name ?? 'Unknown'
								} Email: ${user.email}`}</h3>
								<DeleteButton id={user.id} />
							</div>
						);
					})}
			</main>
		</div>
	);
}
