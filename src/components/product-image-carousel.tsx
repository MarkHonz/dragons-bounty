'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

type Props = {
	paths: string[];
	name: string;
};

const SWIPE_DISTANCE = 40;

export default function ProductImageCarousel({ paths, name }: Props) {
	const imageUrl = process.env.NEXT_PUBLIC_S3_BASE_URL;
	const [index, setIndex] = useState(0);
	const touchStartX = useRef<number | null>(null);

	if (paths.length === 0) {
		return (
			<div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
				No image available
			</div>
		);
	}

	const go = (next: number) =>
		setIndex((next + paths.length) % paths.length);

	const hasMany = paths.length > 1;

	return (
		<div
			className="flex w-full flex-col gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			tabIndex={hasMany ? 0 : undefined}
			onKeyDown={(event) => {
				if (!hasMany) return;
				if (event.key === 'ArrowLeft') go(index - 1);
				if (event.key === 'ArrowRight') go(index + 1);
			}}
			onTouchStart={(event) => {
				touchStartX.current = event.touches[0].clientX;
			}}
			onTouchEnd={(event) => {
				if (!hasMany || touchStartX.current === null) return;
				const distance = event.changedTouches[0].clientX - touchStartX.current;
				touchStartX.current = null;
				if (distance > SWIPE_DISTANCE) go(index - 1);
				if (distance < -SWIPE_DISTANCE) go(index + 1);
			}}
		>
			<div className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-muted">
				<Image
					key={paths[index]}
					src={`${imageUrl}${paths[index]}`}
					alt={`Image ${index + 1} of ${paths.length} of ${name}`}
					width={400}
					height={400}
					className="h-auto w-full max-w-sm object-contain"
					priority={index === 0}
				/>
				{hasMany && (
					<>
						<button
							type="button"
							aria-label="Previous image"
							onClick={() => go(index - 1)}
							className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-warm-sm hover:bg-card"
						>
							<ChevronLeft className="h-5 w-5" />
						</button>
						<button
							type="button"
							aria-label="Next image"
							onClick={() => go(index + 1)}
							className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-warm-sm hover:bg-card"
						>
							<ChevronRight className="h-5 w-5" />
						</button>
					</>
				)}
			</div>
			{hasMany && (
				<div className="flex flex-wrap justify-center gap-2">
					{paths.map((path, i) => (
						<button
							key={path}
							type="button"
							aria-label={`Show image ${i + 1}`}
							aria-current={i === index}
							onClick={() => setIndex(i)}
							className={cn(
								'overflow-hidden rounded-lg border-2 bg-muted',
								i === index ? 'border-primary' : 'border-transparent opacity-70'
							)}
						>
							<Image
								src={`${imageUrl}${path}`}
								alt=""
								width={64}
								height={64}
								className="h-14 w-14 object-cover"
							/>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
