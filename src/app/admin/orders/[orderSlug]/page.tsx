import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { AddressType, getAddressByProfileId } from '@/db/user-db';
import { formatCurrency } from '@/lib/formatters';
import { updateOrderFulfillmentAction } from '@/actions/order-actions';
import OrderTotals from '@/components/order-totals';
import RefundOrderForm from '../_components/refund-order-form';

type OrderDetailsParams = {
	params: {
		orderSlug: string;
	};
};

export default async function OrderDetailPage({ params }: OrderDetailsParams) {
	const { orderSlug } = params;

	// get the order details
	const order = (await getOrderDetails(orderSlug)) as OrderProps;

	// if order not found
	if (!order) {
		return <p className="text-center text-muted-foreground">Order not found</p>;
	}

	// get the order address
	const address = (await getAddressByProfileId(order.profileId)) as AddressType;

	// get the order products
	const orderProducts = (await getOrderProductsByOrderId(
		order.id
	)) as OrderProductProps[];

	const isRefunded = Boolean(order.refundedAt);
	const status = isRefunded
		? 'Refunded'
		: order.fulfilled
			? 'Fulfilled'
			: 'Processing';
	const refundedAmount = formatCurrency((order.refundedAmountInCents ?? 0) / 100);

	return (
		<main className="mx-auto max-w-3xl">
			<h1 className="mb-3 font-display text-3xl font-semibold">
				Order Details
			</h1>
			<div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
				<Badge
					variant={
						isRefunded ? 'destructive' : order.fulfilled ? 'secondary' : 'outline'
					}
				>
					{status}
				</Badge>
				{isRefunded ? (
					<span className="text-muted-foreground">
						{refundedAmount} refunded on{' '}
						{new Date(order.refundedAt as Date).toLocaleDateString()}{' '}
						{order.stripePaymentIntentId
							? 'through Stripe'
							: '(marked refunded by hand; no money moved through the site)'}
					</span>
				) : (
					order.refundedAmountInCents ? (
						<span className="text-muted-foreground">
							{refundedAmount} of {formatCurrency(order.totalInCents / 100)}{' '}
							refunded in Stripe
						</span>
					) : null
				)}
			</div>
			<div className="flex flex-col items-start gap-6 md:flex-row">
				<Card className="w-full flex-1 p-4 shadow-warm-sm sm:p-6">
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
					{!isRefunded && (
						<form
							action={updateOrderFulfillmentAction}
							className="mt-4 flex w-full flex-col items-start gap-3 border-t border-border pt-4"
						>
							<input type="hidden" name="orderId" value={order.id} />
							<label className="flex items-center gap-2 text-sm font-semibold">
								<Checkbox name="fulfilled" defaultChecked={order.fulfilled} />
								Fulfilled
							</label>
							<div className="flex w-full flex-col gap-1.5">
								<Label htmlFor="trackingNumber">Tracking number</Label>
								<Input
									id="trackingNumber"
									type="text"
									name="trackingNumber"
									defaultValue={order.trackingNumber ?? ''}
								/>
							</div>
							<Button type="submit" className="rounded-full">
								Save
							</Button>
						</form>
					)}
					{!isRefunded && (
						<div className="mt-4 flex w-full flex-col gap-3 border-t border-border pt-4">
							<h2 className="font-display text-lg font-semibold">Refund</h2>
							<RefundOrderForm
								orderId={order.id}
								totalInCents={order.totalInCents}
								hasStripePayment={Boolean(order.stripePaymentIntentId)}
								shipped={Boolean(order.fulfilled)}
							/>
						</div>
					)}
				</Card>
				<Card className="w-full shadow-warm-sm md:w-72">
					<CardHeader>
						<CardTitle className="font-display text-xl">
							Shipping Address
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-2 text-sm">
						<div className="flex justify-between gap-4">
							<span className="text-muted-foreground">Name</span>
							<span className="text-right font-semibold">{address.name}</span>
						</div>
						<div className="flex justify-between gap-4">
							<span className="text-muted-foreground">Address 1</span>
							<span className="text-right font-semibold">
								{address.address1}
							</span>
						</div>
						<div className="flex justify-between gap-4">
							<span className="text-muted-foreground">Address 2</span>
							<span className="text-right font-semibold">
								{address.address2}
							</span>
						</div>
						<div className="flex justify-between gap-4">
							<span className="text-muted-foreground">City</span>
							<span className="text-right font-semibold">{address.city}</span>
						</div>
						<div className="flex justify-between gap-4">
							<span className="text-muted-foreground">State</span>
							<span className="text-right font-semibold">{address.state}</span>
						</div>
						<div className="flex justify-between gap-4">
							<span className="text-muted-foreground">Zip</span>
							<span className="text-right font-semibold">{address.zip}</span>
						</div>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
