import { userLogout } from '@/actions/user-actions';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ShoppingBag } from 'lucide-react';

import { verifyAuthSession } from '@/lib/auth';
import { CartProps, getCartById, getCartIdByUserId } from '@/db/cart-db';
import { findActiveCategories } from '@/db/category-db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MobileNav from '@/components/mobile-nav';

export default async function MainHeader() {
	const sessionUserId = await verifyAuthSession();
	const authenticatedUser =
		sessionUserId.user !== null ? sessionUserId.user.id : 'guest';

	let cartId: string | null = 'guest';
	if (authenticatedUser !== 'guest') {
		cartId = (await getCartIdByUserId(authenticatedUser)) as string;
	}

	const cartItems = (await getCartById(cartId)) as CartProps[];
	const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);

	const categories = await findActiveCategories();
	const navItems = [
		...categories.slice(0, 4).map((category) => ({
			href: `/category/${category.id}`,
			label: category.name,
		})),
		{ href: '/#gallery', label: 'Gallery' },
	];

	return (
		<header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
			<div className="mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-5 py-3 md:px-10">
				<Link href="/" className="flex flex-shrink-0 items-center gap-3">
					<Image
						src="/images/CoinLogo.png"
						alt="Dragon's Bounty coin logo"
						width={126}
						height={126}
						className="h-[126px] w-[126px] object-contain"
					/>
					<span className="whitespace-nowrap font-display text-xl font-semibold md:text-[2.5rem]">
						Dragon&apos;s Bounty
					</span>
				</Link>

				<nav className="hidden items-center gap-8 md:flex">
					<Link href="/" className="text-sm font-bold text-foreground">
						Shop
					</Link>
					{navItems.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							className="text-sm font-semibold text-muted-foreground hover:text-primary"
						>
							{item.label}
						</Link>
					))}
				</nav>

				<div className="flex flex-shrink-0 items-center gap-3">
					<Button
						variant="outline"
						size="icon"
						className="hidden rounded-full sm:inline-flex"
						aria-label="Search"
					>
						<Search className="h-4 w-4" />
					</Button>

					{authenticatedUser === 'guest' ? (
						<Link
							href="/sign-in"
							className="hidden whitespace-nowrap rounded-full border border-border bg-card px-4 py-2 text-sm font-bold sm:inline-block"
						>
							Sign In
						</Link>
					) : (
						<form action={userLogout} className="hidden sm:inline-block">
							<button className="whitespace-nowrap rounded-full border border-border bg-card px-4 py-2 text-sm font-bold">
								Logout
							</button>
						</form>
					)}

					<Link href="/cart" className="relative">
						<Button
							variant="default"
							size="icon"
							className="rounded-full"
							aria-label="Cart"
						>
							<ShoppingBag className="h-4 w-4" />
						</Button>
						{totalQuantity > 0 && (
							<Badge
								variant="secondary"
								className="absolute -right-1 -top-1 h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-background p-0 text-[11px]"
							>
								{totalQuantity}
							</Badge>
						)}
					</Link>

					<MobileNav
						navItems={navItems}
						isSignedIn={authenticatedUser !== 'guest'}
					/>
				</div>
			</div>
		</header>
	);
}
