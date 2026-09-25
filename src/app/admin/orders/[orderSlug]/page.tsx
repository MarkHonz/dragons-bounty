import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { getAddressByProfileId } from '@/db/user-db';
import { formatCurrency } from '@/lib/formatters';
import { formatVariantLabel } from '@/lib/variants';
import OrderTotals, { discountRows } from '@/components/order-totals';
import RefundOrderForm from '../_components/refund-order-form';
import OrderNotes from '../_components/order-notes';
import OrderHistory from '../_components/order-history';
import { getOrderNotes } from '@/db/order-notes-db';
import { getOrderActivity } from '@/db/activity-db';
import { getOrderPackages } from '@/db/shipment-db';
import { orderShippingLabel } from '@/lib/shipping-status';
import OrderPackages from '../_components/order-packages';

type ShippingAddress = {
	name: string | null;
	address1: string | null;
	address2: string | null;
	city: string | null;
	state: string | null;
	zip: string | null;
};

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

	// the address saved with the order at checkout; orders placed before that was
	// saved fall back to the customer's current profile address, which may differ
	const hasSavedAddress = Boolean(order.shipToAddress1);
	const address: ShippingAddress | null = hasSavedAddress
		? {
				name: order.shipToName ?? null,
				address1: order.shipToAddress1 ?? null,
				address2: order.shipToAddress2 ?? null,
				city: order.shipToCity ?? null,
				state: order.shipToState ?? null,
				zip: order.shipToZip ?? null,
			}
		: await getAddressByProfileId(order.profileId);
	const addressRows: [string, string | null | undefined][] = [
		['Name', address?.name],
		['Address 1', address?.address1],
		['Address 2', address?.address2],
		['City', address?.city],
		['State', address?.state],
		['Zip', address?.zip],
	];

	// get the order products
	const orderProducts = (await getOrderProductsByOrderId(
		order.id
	)) as OrderProductProps[];

	// the History card is a convenience: if the log can't be read, the rest of
	// the order page still works
	const [notes, history, packages] = await Promise.all([
		getOrderNotes(order.id),
		getOrderActivity(order.id).catch((error) => {
			console.error('Failed to read the order history', error);
			return [];
		}),
		getOrderPackages(order.id),
	]);

	const isRefunded = Boolean(order.refundedAt);
	const shippedCount = packages.filter((pkg) => pkg.shipment).length;
	const status = orderShippingLabel(order, {
		shipped: shippedCount,
		total: packages.length,
	});
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
										<TableRow key={`${product.product_id}:${product.variant_id}`}>
											<TableCell>
											{formatVariantLabel(productName, product.variantName)}
										</TableCell>
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
								...discountRows(order),
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
						<div className="mt-4 flex w-full flex-col gap-3 border-t border-border pt-4">
							<h2 className="font-display text-lg font-semibold">Refund</h2>
							<RefundOrderForm
								orderId={order.id}
								totalInCents={order.totalInCents}
								hasStripePayment={Boolean(order.stripePaymentIntentId)}
								shipped={shippedCount > 0}
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
						{!hasSavedAddress && (
							<p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
								This order was placed before shipping addresses were saved with
								orders. This is the customer&apos;s current address, and it may
								have changed since the order.
							</p>
						)}
						{addressRows.map(([label, value]) => (
							<div key={label} className="flex justify-between gap-4">
								<span className="text-muted-foreground">{label}</span>
								<span className="text-right font-semibold">{value}</span>
							</div>
						))}
					</CardContent>
				</Card>
			</div>
			<div className="mt-6">
				<OrderPackages
					orderId={order.id}
					packages={packages}
					refunded={isRefunded}
				/>
			</div>
			<div className="mt-6 flex flex-col items-start gap-6 md:flex-row">
				<OrderNotes orderId={order.id} notes={notes} />
				<OrderHistory entries={history} />
			</div>
		</main>
	);
}
