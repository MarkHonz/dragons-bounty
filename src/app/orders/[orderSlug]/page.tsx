import { Card } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	getOrderDetails,
	// getOrderProducts,
	getOrderProductsByOrderId,
	OrderProductProps,
	OrderProps,
} from '@/db/orders-db';

type OrderDetailsParams = {
	params: {
		orderSlug: string;
	};
};

export default async function OrderDetailPage({ params }: OrderDetailsParams) {
	const { orderSlug } = params;

	// get the order details
	const order = (await getOrderDetails(orderSlug)) as OrderProps;
	console.log('Order Details :', order);
	console.log('Order Slug', orderSlug);

	// get the order products
	const orderProducts = (await getOrderProductsByOrderId(
		order.id
	)) as OrderProductProps[];
	console.log('Order Products :', orderProducts);

	// const allProducts = (await getOrderProducts()) as OrderProductProps[];
	// console.log('All Products :', allProducts);

	return (
		<main className="flex flex-col justify-center items-center max-w-lg m-auto">
			<h1 className="text-4xl mb-4 p-3">Order Details</h1>
			<Card className="p-3 m-3">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Product</TableHead>
							<TableHead>Quantity</TableHead>
							<TableHead>Price</TableHead>
							<TableHead>Total</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow>
							<TableCell>Product 1</TableCell>
							<TableCell>1</TableCell>
							<TableCell>$10.00</TableCell>
							<TableCell>$10.00</TableCell>
						</TableRow>
						<TableRow>
							<TableCell>Product 2</TableCell>
							<TableCell>2</TableCell>
							<TableCell>$20.00</TableCell>
							<TableCell>{order.totalInCents}</TableCell>
						</TableRow>
					</TableBody>
				</Table>
				<div className="flex flex-row justify-end w-full pt-3">
					<p className="font-bold">Total: $50.00</p>
				</div>
				{orderProducts.map((product) => (
					<div key={product.product_id}>
						<p>{product.product_id}</p>
						<p>{product.quantity}</p>
					</div>
				))}
			</Card>
		</main>
	);
}
