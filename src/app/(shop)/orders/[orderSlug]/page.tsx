import { notFound, redirect } from 'next/navigation';

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
import { getProfileIdByUserId } from '@/db/user-db';
import { verifyAuthSession } from '@/lib/auth';
import { formatCurrency } from '@/lib/formatters';
import { formatVariantLabel } from '@/lib/variants';
import { signInUrl } from '@/lib/redirects';
import OrderTotals, { discountRows } from '@/components/order-totals';
import { getOrderPackages } from '@/db/shipment-db';
import { orderShippingLabel } from '@/lib/shipping-status';

type OrderDetailsParams = {
	params: {
		orderSlug: string;
	};
};

export default async function OrderDetailPage({ params }: OrderDetailsParams) {
	const { orderSlug } = params;

	// only the customer who placed an order may see it
	const { user } = await verifyAuthSession();
	if (user == null) {
		redirect(signInUrl(`/orders/${orderSlug}`));
	}
	const profileId = await getProfileIdByUserId(user.id);

	// get the order details
	const order = (await getOrderDetails(orderSlug)) as OrderProps | null;

	// someone else's order looks exactly like one that doesn't exist, so this
	// page can't be used to find out which order ids are real
	if (!order || order instanceof Error || order.profileId !== profileId) {
		notFound();
	}

	// get the order products
	const orderProducts = (await getOrderProductsByOrderId(
		order.id
	)) as OrderProductProps[];
	// one package per seller: the shop, and each artist with items in the order
	const packages = await getOrderPackages(order.id);

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
				{order.shipToAddress1 && (
					<div className="mt-4 flex flex-col gap-0.5 border-t border-border pt-4 text-sm">
						<h2 className="mb-1 font-semibold">Shipping to</h2>
						{order.shipToName && <p>{order.shipToName}</p>}
						<p>{order.shipToAddress1}</p>
						{order.shipToAddress2 && <p>{order.shipToAddress2}</p>}
						<p>
							{[order.shipToCity, order.shipToState].filter(Boolean).join(', ')}{' '}
							{order.shipToZip}
						</p>
					</div>
				)}
				<div className="mt-4 flex flex-col gap-1 border-t border-border pt-4 text-sm text-muted-foreground">
					<p>
						Status:{' '}
						{orderShippingLabel(order, {
							shipped: packages.filter((pkg) => pkg.shipment).length,
							total: packages.length,
						})}
					</p>
					{order.refundedAt && (
						<p>
							Refunded {formatCurrency((order.refundedAmountInCents ?? 0) / 100)}{' '}
							on {order.refundedAt.toLocaleDateString()}
						</p>
					)}
					{packages.length > 1 && (
						<p>
							Your order comes in {packages.length} packages, each sent separately
							by the person who made the items.
						</p>
					)}
					<ul className="flex flex-col gap-2">
						{packages.map((pkg) => {
							const from = pkg.sellerId
								? (pkg.sellerName ?? 'an artist')
								: "Dragon's Bounty";
							const items = pkg.lines
								.map((line) => formatVariantLabel(line.productName, line.variantName))
								.join(', ');
							return (
								<li key={pkg.sellerId || 'shop'} className="break-words">
									{packages.length > 1 && (
										<span className="block text-foreground">
											From {from}: {items}
										</span>
									)}
									{pkg.shipment
										? `Shipped${
												pkg.shipment.trackingNumber
													? ` — tracking number ${pkg.shipment.trackingNumber}`
													: ''
											}`
										: order.refundedAt
											? 'Not shipped'
											: 'Not shipped yet — tracking number not available'}
								</li>
							);
						})}
					</ul>
				</div>
			</Card>
		</main>
	);
}
