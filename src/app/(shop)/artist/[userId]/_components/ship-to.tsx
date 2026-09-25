import type { ArtistOrder } from '@/db/artist-db';

// The shipping address, one line each, as the customer entered it at checkout.
export default function ShipTo({ shipTo }: { shipTo: ArtistOrder['shipTo'] }) {
	const cityLine = [shipTo.city, [shipTo.state, shipTo.zip].filter(Boolean).join(' ')]
		.filter(Boolean)
		.join(', ');
	const lines = [shipTo.name, shipTo.address1, shipTo.address2, cityLine].filter(
		(line): line is string => Boolean(line)
	);
	if (lines.length === 0) {
		return (
			<p className="text-sm text-destructive">
				No shipping address on this order. Please contact the shop.
			</p>
		);
	}
	return (
		<address className="break-words text-sm not-italic leading-relaxed">
			{lines.map((line, index) => (
				<span key={index} className={index === 0 ? 'block font-semibold' : 'block'}>
					{line}
				</span>
			))}
		</address>
	);
}
