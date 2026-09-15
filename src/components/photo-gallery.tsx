import React from 'react';
import { getPhotos } from '@/db/photos-db';

export default async function PhotoGallery(
	{ limit }: { limit?: number } = { limit: 12 }
) {
	const photos = await getPhotos();
	const list = limit ? photos.slice(0, limit) : photos;

	if (!list || list.length === 0) {
		return null;
	}

	return (
		<section
			id="gallery"
			className="mx-auto max-w-[1320px] scroll-mt-24 px-5 py-14 sm:px-10"
		>
			<div className="mx-auto mb-9 max-w-xl text-center">
				<h2 className="mb-2.5 font-display text-3xl font-semibold">Gallery</h2>
				<p className="text-muted-foreground">
					A look inside the shop, the hoard, and the dragon who guards it.
				</p>
			</div>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
				{list.map((p) => (
					<div
						key={p.id}
						className="overflow-hidden rounded-2xl border border-border bg-muted shadow-warm-sm"
					>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={p.url}
							alt={p.caption ?? 'gallery photo'}
							className="h-40 w-full object-cover"
						/>
					</div>
				))}
			</div>
		</section>
	);
}
