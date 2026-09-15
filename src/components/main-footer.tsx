import Image from 'next/image';
import Link from 'next/link';

export default function MainFooter() {
	return (
		<footer className="mt-8 border-t border-border bg-card">
			<div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-10 px-5 py-14 sm:px-10 md:grid-cols-[1.4fr_1fr_1fr]">
				<div>
					<div className="mb-3 flex items-center gap-2.5">
						<Image
							src="/images/CoinLogo.png"
							alt="Dragon's Bounty coin logo"
							width={32}
							height={32}
							className="h-8 w-8 object-contain"
						/>
						<span className="font-display text-lg font-semibold">
							Dragon&apos;s Bounty
						</span>
					</div>
					<p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
						Adventuring supplies, potions, and curiosities &mdash; gathered,
						tested, and occasionally napped on by our resident dragon.
					</p>
				</div>
				<div>
					<div className="mb-3 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
						Shop
					</div>
					<div className="flex flex-col gap-2.5 text-sm font-semibold">
						<Link href="/">All Products</Link>
						<Link href="/#gallery">Gallery</Link>
					</div>
				</div>
				<div>
					<div className="mb-3 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
						Support
					</div>
					<div className="flex flex-col gap-2.5 text-sm font-semibold">
						<Link href="/sign-in">Sign In</Link>
						<Link href="/orders">Your Orders</Link>
						<Link href="/account">Account</Link>
					</div>
				</div>
			</div>
			<div className="border-t border-border">
				<div className="mx-auto flex max-w-[1320px] flex-col gap-1 px-5 py-4 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-10">
					<span>&copy; {new Date().getFullYear()} Dragon&apos;s Bounty</span>
					<span>Illustrations by the in-house dragon</span>
				</div>
			</div>
		</footer>
	);
}
