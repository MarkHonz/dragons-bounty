import type { ArtistOrder } from '@/db/artist-db';
import { formatVariantLabel } from '@/lib/variants';

export default function ItemList({ lines }: { lines: ArtistOrder['lines'] }) {
	return (
		<ul className="flex flex-col gap-1 text-sm">
			{lines.map((line) => (
				<li key={`${line.productId}:${line.variantName}`} className="break-words">
					<span className="font-semibold">{line.quantity} &times;</span>{' '}
					{formatVariantLabel(line.productName, line.variantName)}
				</li>
			))}
		</ul>
	);
}
