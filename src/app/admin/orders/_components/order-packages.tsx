import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LocalTime from '@/components/local-time';
import ShipPackageForm from '@/components/ship-package-form';
import type { OrderPackage } from '@/db/shipment-db';
import { formatVariantLabel } from '@/lib/variants';
import UnshipPackageButton from './unship-package-button';

// One row per seller in the order: what they're sending, whether it has gone,
// and its tracking number. The admin can ship any package, correct a tracking
// number, or undo a "shipped".
export default function OrderPackages({
	orderId,
	packages,
	refunded,
}: {
	orderId: string;
	packages: OrderPackage[];
	refunded: boolean;
}) {
	return (
		<Card className="w-full shadow-warm-sm">
			<CardHeader>
				<CardTitle className="font-display text-xl">
					{packages.length === 1 ? 'Shipping' : `Packages (${packages.length})`}
				</CardTitle>
				{packages.length > 1 && (
					<p className="text-xs text-muted-foreground">
						This order has items from more than one seller. Each sends their own
						package; the order counts as shipped once all of them have.
					</p>
				)}
			</CardHeader>
			<CardContent className="flex flex-col divide-y divide-border text-sm">
				{packages.length === 0 && (
					<p className="text-muted-foreground">This order has no items.</p>
				)}
				{packages.map((pkg) => {
					const label = pkg.sellerId
						? (pkg.sellerName ?? 'A former artist')
						: "The shop (Dragon's Bounty)";
					return (
						<section
							key={pkg.sellerId || 'shop'}
							aria-label={`Package from ${label}`}
							className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
						>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<h3 className="font-semibold">
									{pkg.sellerIsArtist ? (
										<Link
											href={`/artist/${pkg.sellerId}`}
											className="text-primary underline"
										>
											{label}
										</Link>
									) : (
										label
									)}
								</h3>
								<Badge variant={pkg.shipment ? 'secondary' : 'outline'}>
									{pkg.shipment ? 'Shipped' : refunded ? 'Not shipped' : 'Needs shipping'}
								</Badge>
							</div>
							<ul className="list-disc pl-5 text-muted-foreground">
								{pkg.lines.map((line) => (
									<li key={`${line.productId}:${line.variantName}`}>
										{line.quantity} &times;{' '}
										{formatVariantLabel(line.productName, line.variantName)}
									</li>
								))}
							</ul>
							{pkg.shipment && (
								<p className="text-muted-foreground">
									Shipped <LocalTime value={pkg.shipment.shippedAt} />
									{pkg.shipment.trackingNumber ? '' : ' (no tracking number recorded)'}
								</p>
							)}
							{!refunded && (
								<ShipPackageForm
									orderId={orderId}
									sellerId={pkg.sellerId}
									current={pkg.shipment ? (pkg.shipment.trackingNumber ?? '') : undefined}
								/>
							)}
							{refunded && pkg.shipment?.trackingNumber && (
								<p>
									Tracking number:{' '}
									<span className="font-semibold">{pkg.shipment.trackingNumber}</span>
								</p>
							)}
							{pkg.shipment && !refunded && (
								<UnshipPackageButton
									orderId={orderId}
									sellerId={pkg.sellerId}
									sellerLabel={label}
								/>
							)}
						</section>
					);
				})}
			</CardContent>
		</Card>
	);
}
