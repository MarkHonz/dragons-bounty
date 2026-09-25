'use client';

import { useId } from 'react';

import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

export type ArtistOption = { id: string; artistName: string | null; email: string };

// the Select can't hold an empty value, so the shop's own products use this
const SHOP = 'shop';

// Who makes and ships the product: the shop itself, or one of the artists.
// `value` is "" for the shop, else the artist's user id.
export default function ArtistSelect({
	artists,
	value,
	onChange,
}: {
	artists: ArtistOption[];
	value: string;
	onChange: (value: string) => void;
}) {
	const labelId = useId();
	// a product can still point at someone who has since stopped being an artist
	const known = value === '' || artists.some((artist) => artist.id === value);
	return (
		<div className="flex flex-col gap-2 pb-2">
			<Label id={labelId} className="pl-2">
				Artist
			</Label>
			<Select
				value={value === '' ? SHOP : value}
				onValueChange={(next) => onChange(next === SHOP ? '' : next)}
			>
				<SelectTrigger aria-labelledby={labelId}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={SHOP}>The shop (no artist)</SelectItem>
					{artists.map((artist) => (
						<SelectItem key={artist.id} value={artist.id}>
							{artist.artistName ?? artist.email}
						</SelectItem>
					))}
					{!known && (
						<SelectItem value={value} disabled>
							A former artist
						</SelectItem>
					)}
				</SelectContent>
			</Select>
			<p className="pl-2 text-xs text-muted-foreground">
				An artist&apos;s products are shipped by the artist, and shown as
				&ldquo;Made by&rdquo; them.
			</p>
		</div>
	);
}
