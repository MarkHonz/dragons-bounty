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
	getOrderProductsByOrderId,
	OrderProductProps,
	OrderProps,
} from '@/db/orders-db';
import { getProductNameById } from '@/db/product-db';
import { formatCurrency } from '@/lib/formatters';
import OrderTotals from '@/components/order-totals';

type OrderDetailsParams = {
	params: {
		orderSlug: string;
	};
};

export default async function OrderDetailPage({ params }: OrderDetailsParams) {
	const { orderSlug } = params;

	// get the order details
	const order = (await getOrderDetails(orderSlug)) as OrderProps;

	// get the order products
	const orderProducts = (await getOrderProductsByOrderId(
		order.id
	)) as OrderProductProps[];

	return (
		<main className="mx-auto flex max-w-lg flex-col items-center px-5 py-10 sm:px-10">
			<h1 className="mb-6 font-display text-3xl font-semibold">
				Order Details
			</h1>
			<Card className="w-full p-4 shadow-warm-sm sm:p-6">
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
						{await Promise.all(
							orderProducts.map(async (product: OrderProductProps) => {
								const productName = (await getProductNameById(
									product.product_id
								)) as string;
								return (
									<TableRow key={product.product_id}>
										<TableCell>{productName}</TableCell>
										<TableCell>{product.quantity}</TableCell>
										<TableCell>
											{formatCurrency(product.priceInCents / 100)}
										</TableCell>
										<TableCell>
											{formatCurrency(
												(product.priceInCents * product.quantity) / 100
											)}
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
				<div className="w-full pt-4">
					<OrderTotals
						rows={[
							{
								label: 'Product Total',
								value: formatCurrency(order.productTotalInCents / 100),
							},
							{
								label: 'Shipping Total',
								value: formatCurrency(order.shippingTotalInCents / 100),
							},
							{
								label: 'Tax Total',
								value: formatCurrency(order.taxTotalInCents / 100),
							},
							{
								label: 'Order Total',
								value: formatCurrency(order.totalInCents / 100),
								emphasis: true,
							},
						]}
					/>
				</div>
				<div className="mt-4 flex flex-col gap-1 border-t border-border pt-4 text-sm text-muted-foreground">
					<p>
						Status:{' '}
						{order.refundedAt
							? 'Refunded'
							: order.fulfilled
								? 'Shipped'
								: 'Processing'}
					</p>
					{order.refundedAt && (
						<p>
							Refunded {formatCurrency((order.refundedAmountInCents ?? 0) / 100)}{' '}
							on {order.refundedAt.toLocaleDateString()}
						</p>
					)}
					<p>
						Tracking number:{' '}
						{order.trackingNumber ? order.trackingNumber : 'not available'}
					</p>
				</div>
			</Card>
		</main>
	);
}
