'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
	ACCEPTED_IMAGE_TYPES,
	MAX_ORIGINAL_IMAGE_BYTES,
	MAX_PRODUCT_IMAGES,
	validateImageFile,
} from '@/lib/product-images';
import { resizeImage } from '@/lib/resize-image';

export type ProductImagesValue = {
	// paths of images the product already has, in display order
	keep: string[];
	// newly chosen files, shown after the kept images
	added: File[];
};

type Props = {
	value: ProductImagesValue;
	onChange: (value: ProductImagesValue) => void;
	error?: string;
};

export default function ProductImagesField({ value, onChange, error }: Props) {
	const imageUrl = process.env.NEXT_PUBLIC_S3_BASE_URL;
	const [notice, setNotice] = useState('');
	const [processing, setProcessing] = useState(false);
	const total = value.keep.length + value.added.length;

	const previews = useMemo(
		() => value.added.map((file) => URL.createObjectURL(file)),
		[value.added]
	);
	useEffect(
		() => () => previews.forEach((url) => URL.revokeObjectURL(url)),
		[previews]
	);

	const handleFiles = async (files: FileList | null) => {
		if (!files || files.length === 0) return;
		const messages: string[] = [];
		const candidates: File[] = [];
		Array.from(files).forEach((file) => {
			const problem = validateImageFile(file, MAX_ORIGINAL_IMAGE_BYTES);
			if (problem) {
				messages.push(problem);
			} else {
				candidates.push(file);
			}
		});

		const room = MAX_PRODUCT_IMAGES - total;
		if (candidates.length > room) {
			messages.push(
				`A product can have at most ${MAX_PRODUCT_IMAGES} images; ${
					candidates.length - room
				} extra file(s) were skipped`
			);
		}

		// shrink the photos here so the upload stays small
		setProcessing(true);
		const accepted: File[] = [];
		for (const file of candidates.slice(0, Math.max(room, 0))) {
			const resized = await resizeImage(file);
			const problem = validateImageFile(resized);
			if (problem) {
				messages.push(problem);
			} else {
				accepted.push(resized);
			}
		}
		setProcessing(false);

		setNotice(messages.join('. '));
		if (accepted.length > 0) {
			onChange({ ...value, added: [...value.added, ...accepted] });
		}
	};

	const moveToFront = <T,>(items: T[], index: number) => [
		items[index],
		...items.filter((_, i) => i !== index),
	];

	const tiles: {
		key: string;
		src: string;
		isExisting: boolean;
		index: number;
	}[] = [
		...value.keep.map((path, index) => ({
			key: path,
			src: `${imageUrl}${path}`,
			isExisting: true,
			index,
		})),
		...value.added.map((file, index) => ({
			key: `${file.name}-${index}`,
			src: previews[index],
			isExisting: false,
			index,
		})),
	];

	return (
		<div className="flex flex-col gap-2 pb-2">
			<div className="flex items-center justify-between pl-2">
				<span className="text-sm font-medium">Images</span>
				<span className="text-xs text-muted-foreground">
					{total} of {MAX_PRODUCT_IMAGES}
				</span>
			</div>

			{tiles.length > 0 && (
				<div className="grid grid-cols-3 gap-2">
					{tiles.map((tile, position) => {
						const isCover = position === 0;
						// a photo can be promoted within its own group; the cover is
						// always the first kept image, or the first new one if none are kept
						const canMakeCover =
							!isCover &&
							(tile.isExisting || value.keep.length === 0) &&
							tile.index > 0;
						return (
							<div
								key={tile.key}
								className="relative overflow-hidden rounded-lg border border-border bg-muted"
							>
								<Image
									src={tile.src}
									alt={`Product image ${position + 1}`}
									width={120}
									height={120}
									unoptimized={!tile.isExisting}
									className="aspect-square w-full object-cover"
								/>
								{isCover && (
									<Badge className="absolute left-1 top-1 px-2 py-0 text-[10px]">
										Cover
									</Badge>
								)}
								<button
									type="button"
									aria-label={`Remove image ${position + 1}`}
									onClick={() =>
										tile.isExisting
											? onChange({
													...value,
													keep: value.keep.filter((_, i) => i !== tile.index),
											  })
											: onChange({
													...value,
													added: value.added.filter((_, i) => i !== tile.index),
											  })
									}
									className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card/90 text-foreground hover:bg-card"
								>
									<X className="h-3 w-3" />
								</button>
								{canMakeCover && (
									<button
										type="button"
										onClick={() =>
											tile.isExisting
												? onChange({
														...value,
														keep: moveToFront(value.keep, tile.index),
												  })
												: onChange({
														...value,
														added: moveToFront(value.added, tile.index),
												  })
										}
										className="absolute inset-x-0 bottom-0 bg-card/90 py-0.5 text-[10px] font-semibold hover:bg-card"
									>
										Make cover
									</button>
								)}
							</div>
						);
					})}
				</div>
			)}

			{total < MAX_PRODUCT_IMAGES && (
				<Input
					type="file"
					multiple
					disabled={processing}
					accept={ACCEPTED_IMAGE_TYPES.join(', ')}
					onChange={(event) => {
						const input = event.target;
						handleFiles(input.files).finally(() => {
							// allow choosing the same file again after removing it
							input.value = '';
						});
					}}
				/>
			)}
			{processing && (
				<p className="pl-2 text-xs text-muted-foreground">Preparing photos&hellip;</p>
			)}
			<p className="pl-2 text-xs text-muted-foreground">
				1 to {MAX_PRODUCT_IMAGES} images (JPG, PNG or WebP, up to 25 MB each;
				large photos are shrunk automatically). The first image is the cover.
			</p>
			{notice && <p className="pl-2 text-xs text-destructive">{notice}</p>}
			{error && <p className="pl-2 text-sm font-medium text-destructive">{error}</p>}
		</div>
	);
}
