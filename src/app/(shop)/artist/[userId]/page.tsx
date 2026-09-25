import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import LocalTime from '@/components/local-time';
import ShipPackageForm from '@/components/ship-package-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getArtistPageData } from '@/db/artist-db';
import { getArtistPageAccess } from '@/lib/auth';
import { formatCurrency } from '@/lib/formatters';
import { signInUrl } from '@/lib/redirects';
import { variantPrice } from '@/lib/variants';
import ItemList from './_components/item-list';
import ShipTo from './_components/ship-to';

export const metadata: Metadata = {
	title: "Artist page | Dragon's Bounty",
	robots: { index: false, follow: false },
};

type Props = { params: { userId: string } };

const orderNumber = (orderId: string) => `#${orderId.slice(-8)}`;

// A small number with its label, for the row at the top.
const Stat = ({ label, value }: { label: string; value: string | number }) => (
	<Card className="shadow-warm-sm">
		<CardHeader className="p-4">
			<p className="text-sm text-muted-foreground">{label}</p>
			<p className="font-display text-3xl font-semibold">{value}</p>
		</CardHeader>
	</Card>
);

// An artist's own page: what they sell, what they must ship (and where), and
// what they've sold. Only that artist or an admin can open it; anyone else gets
// the same "not found" as a made-up address.
export default async function ArtistPage({ params }: Props) {
	const { userId } = params;
	const access = await getArtistPageAccess(userId);
	if (!access.user) redirect(signInUrl(`/artist/${userId}`));
	if (!access.allowed) notFound();

	const data = await getArtistPageData(userId);
	if (!data) notFound();

	const imageBase = process.env.NEXT_PUBLIC_S3_BASE_URL;
	const viewingAsAdmin = access.user.id !== userId;
	const liveProducts = data.products.filter(
		(product) => product.isAvailable && product.category.isActive
	).length;

	return (
		<main className="mx-auto flex max-w-5xl flex-col gap-8 px-5 py-10 sm:px-10">
			<header className="flex flex-col gap-2">
				<h1 className="break-words font-display text-3xl font-semibold">
					{data.artist.name}
				</h1>
				<p className="text-muted-foreground">
					Your artist page: the orders you need to ship, your products, and what
					you&apos;ve sold.
				</p>
				{viewingAsAdmin && (
					<p className="rounded-md bg-muted p-3 text-sm">
						You&apos;re viewing this artist&apos;s page as an admin. Anything you
						mark shipped here is recorded under your name.
					</p>
				)}
			</header>

			<section aria-label="Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<Stat label="Orders to ship" value={data.toShip.length} />
				<Stat label="Items sold this month" value={data.sales.month.items} />
				<Stat label="Products for sale" value={liveProducts} />
			</section>

			<section aria-labelledby="to-ship-heading" className="flex flex-col gap-4">
				<h2 id="to-ship-heading" className="font-display text-2xl font-semibold">
					To ship
				</h2>
				{data.toShip.length === 0 ? (
					<p className="text-muted-foreground">
						Nothing to ship right now. New orders appear here, and you&apos;ll get
						an email too.
					</p>
				) : (
					data.toShip.map((order) => (
						<Card key={order.orderId} className="shadow-warm-sm">
							<CardHeader className="flex flex-row flex-wrap items-baseline justify-between gap-2 pb-3">
								<CardTitle className="font-display text-xl">
									Order {orderNumber(order.orderId)}
								</CardTitle>
								<span className="text-sm text-muted-foreground">
									Ordered <LocalTime value={order.createdAt} />
								</span>
							</CardHeader>
							<CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
								<div className="flex min-w-0 flex-col gap-2">
									<h3 className="text-sm font-semibold text-muted-foreground">
										Items to send
									</h3>
									<ItemList lines={order.lines} />
								</div>
								<div className="flex min-w-0 flex-col gap-2">
									<h3 className="text-sm font-semibold text-muted-foreground">
										Ship to
									</h3>
									<ShipTo shipTo={order.shipTo} />
								</div>
								<div className="md:col-span-2">
									<ShipPackageForm orderId={order.orderId} sellerId={userId} />
								</div>
							</CardContent>
						</Card>
					))
				)}
				{data.refundedUnshipped.map((order) => (
					<Card key={order.orderId} className="border-destructive shadow-warm-sm">
						<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
							<CardTitle className="font-display text-xl">
								Order {orderNumber(order.orderId)}
							</CardTitle>
							<Badge variant="destructive">Refunded &mdash; do not ship</Badge>
						</CardHeader>
						<CardContent className="flex flex-col gap-2">
							<p className="text-sm text-muted-foreground">
								This order was refunded before you shipped it. Please don&apos;t
								send these items:
							</p>
							<ItemList lines={order.lines} />
						</CardContent>
					</Card>
				))}
			</section>

			<section aria-labelledby="shipped-heading" className="flex flex-col gap-4">
				<h2 id="shipped-heading" className="font-display text-2xl font-semibold">
					Shipped
				</h2>
				{data.shipped.length === 0 ? (
					<p className="text-muted-foreground">Nothing shipped yet.</p>
				) : (
					<Card className="shadow-warm-sm">
						<CardContent className="flex flex-col divide-y divide-border pt-6">
							{data.shipped.map((order) => (
								<div
									key={order.orderId}
									className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
								>
									<div className="flex flex-wrap items-baseline justify-between gap-2">
										<span className="font-semibold">
											Order {orderNumber(order.orderId)}
										</span>
										<span className="text-sm text-muted-foreground">
											{order.shipment ? (
												<>
													Shipped <LocalTime value={order.shipment.shippedAt} />
												</>
											) : null}
											{order.refunded ? ' · refunded later' : ''}
										</span>
									</div>
									<ItemList lines={order.lines} />
									{order.refunded ? (
										<p className="text-sm">
											Tracking number:{' '}
											<span className="font-semibold">
												{order.shipment?.trackingNumber ?? 'none'}
											</span>
										</p>
									) : (
										<ShipPackageForm
											orderId={order.orderId}
											sellerId={userId}
											current={order.shipment?.trackingNumber ?? ''}
										/>
									)}
								</div>
							))}
						</CardContent>
					</Card>
				)}
			</section>

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
				<section aria-labelledby="products-heading" className="flex min-w-0 flex-col gap-4">
					<h2 id="products-heading" className="font-display text-2xl font-semibold">
						Your products
					</h2>
					<p className="text-sm text-muted-foreground">
						To add a product or change one, send the photos and details to the shop.
					</p>
					{data.products.length === 0 ? (
						<p className="text-muted-foreground">No products yet.</p>
					) : (
						<Card className="shadow-warm-sm">
							<CardContent className="flex flex-col divide-y divide-border pt-6">
								{data.products.map((product) => {
									const live = product.isAvailable && product.category.isActive;
									const cover = product.images[0]?.path;
									return (
										<div
											key={product.id}
											className="flex gap-4 py-4 first:pt-0 last:pb-0"
										>
											{cover ? (
												<Image
													src={`${imageBase}${cover}`}
													alt=""
													width={64}
													height={64}
													className="h-16 w-16 flex-shrink-0 rounded-md object-cover"
												/>
											) : (
												<div className="h-16 w-16 flex-shrink-0 rounded-md bg-muted" />
											)}
											<div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
												<div className="flex flex-wrap items-center gap-2">
													{live ? (
														<Link
															href={`/products/${product.id}`}
															className="break-words font-semibold text-primary underline"
														>
															{product.name}
														</Link>
													) : (
														<span className="break-words font-semibold">
															{product.name}
														</span>
													)}
													<Badge variant={live ? 'secondary' : 'outline'}>
														{live ? 'For sale' : 'Hidden'}
													</Badge>
												</div>
												{product.variants.length === 0 ? (
													<span className="text-muted-foreground">
														{formatCurrency(product.priceInCents / 100)} &middot;{' '}
														{product.quantity == null
															? 'stock not tracked'
															: product.quantity <= 0
																? 'sold out'
																: `${product.quantity} in stock`}
													</span>
												) : (
													<ul className="text-muted-foreground">
														{product.variants.map((variant) => (
															<li key={variant.id} className="break-words">
																{variant.name}:{' '}
																{formatCurrency(
																	variantPrice(product.priceInCents, variant) / 100
																)}{' '}
																&middot;{' '}
																{variant.quantity <= 0
																	? 'sold out'
																	: `${variant.quantity} in stock`}
															</li>
														))}
													</ul>
												)}
											</div>
										</div>
									);
								})}
							</CardContent>
						</Card>
					)}
				</section>

				<section aria-labelledby="sales-heading" className="flex min-w-0 flex-col gap-4">
					<h2 id="sales-heading" className="font-display text-2xl font-semibold">
						Sales
					</h2>
					<Card className="shadow-warm-sm">
						<CardContent className="flex flex-col gap-4 pt-6 text-sm">
							<dl className="grid grid-cols-2 gap-4">
								<div>
									<dt className="text-muted-foreground">This month</dt>
									<dd className="font-display text-2xl font-semibold">
										{formatCurrency(data.sales.month.totalInCents / 100)}
									</dd>
									<dd className="text-muted-foreground">
										{data.sales.month.items}{' '}
										{data.sales.month.items === 1 ? 'item' : 'items'}
									</dd>
								</div>
								<div>
									<dt className="text-muted-foreground">All time</dt>
									<dd className="font-display text-2xl font-semibold">
										{formatCurrency(data.sales.allTime.totalInCents / 100)}
									</dd>
									<dd className="text-muted-foreground">
										{data.sales.allTime.items}{' '}
										{data.sales.allTime.items === 1 ? 'item' : 'items'}
									</dd>
								</div>
							</dl>
							{data.sales.byProduct.length > 0 && (
								<table className="w-full">
									<thead>
										<tr className="border-b border-border text-left text-muted-foreground">
											<th className="py-2 font-medium">Product</th>
											<th className="py-2 text-right font-medium">Sold</th>
											<th className="py-2 text-right font-medium">Total</th>
										</tr>
									</thead>
									<tbody>
										{data.sales.byProduct.map((row) => (
											<tr key={row.productId} className="border-b border-border last:border-0">
												<td className="break-words py-2 pr-2">{row.productName}</td>
												<td className="py-2 text-right">{row.items}</td>
												<td className="py-2 text-right">
													{formatCurrency(row.totalInCents / 100)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
							<p className="text-xs text-muted-foreground">
								Totals are your item prices times quantity, for orders that
								weren&apos;t refunded. Discount codes, tax and shipping apply to
								the whole order and aren&apos;t included. Payment to you is
								handled by the shop.
							</p>
						</CardContent>
					</Card>
				</section>
			</div>
		</main>
	);
}
