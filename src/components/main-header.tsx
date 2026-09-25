import { userLogout } from '@/actions/user-actions';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, User } from 'lucide-react';

import { verifyAuthSession } from '@/lib/auth';
import { CartProps, getCartById, getCartIdByUserId } from '@/db/cart-db';
import { findActiveCategories } from '@/db/category-db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MobileNav from '@/components/mobile-nav';
import HeaderSearch from '@/components/header-search';
import ThemeToggle from '@/components/theme-toggle';

export default async function MainHeader() {
	const sessionUserId = await verifyAuthSession();
	const authenticatedUser =
		sessionUserId.user !== null ? sessionUserId.user.id : 'guest';
	// an artist's own page, for the header link (null for everyone else)
	const artistPageHref = sessionUserId.user?.isArtist
		? `/artist/${sessionUserId.user.id}`
		: null;

	let cartId: string | null = 'guest';
	if (authenticatedUser !== 'guest') {
		cartId = (await getCartIdByUserId(authenticatedUser)) as string;
	}

	const cartItems = (await getCartById(cartId)) as CartProps[];
	const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);

	const categories = await findActiveCategories();
	const navItems = [
		...categories.map((category) => ({
			href: `/category/${category.id}`,
			label: category.name,
		})),
		{ href: '/#gallery', label: 'Gallery' },
	];

	return (
		<header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
			<div className="mx-auto flex max-w-[1320px] items-center gap-4 px-5 py-3 md:px-10">
				<Link href="/" className="flex flex-shrink-0 items-center">
					<Image
						src="/images/CoinLogo.png"
						alt="Dragon's Bounty coin logo"
						width={126}
						height={126}
						className="h-[126px] w-[126px] object-contain"
					/>
				</Link>

				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<div className="flex items-center gap-4">
						<Link
							href="/"
							className="hidden whitespace-nowrap font-display text-xl font-semibold sm:inline-block md:text-2xl lg:text-[2.5rem]"
						>
							Dragon&apos;s Bounty
						</Link>

						<div className="ml-auto flex flex-shrink-0 items-center gap-3">
							{/* below md the hamburger menu is still showing and already has a
							    Search link, so the inline icon would just be a redundant
							    control competing for the same cramped row */}
							<div className="hidden md:block">
								<HeaderSearch />
							</div>

							<ThemeToggle />

							{authenticatedUser === 'guest' ? (
								<Link
									href="/sign-in"
									className="hidden whitespace-nowrap rounded-full border border-border bg-card px-4 py-2 text-sm font-bold sm:inline-block"
								>
									Sign In
								</Link>
							) : (
								<>
									<form action={userLogout} className="hidden sm:inline-block">
										<button className="whitespace-nowrap rounded-full border border-border bg-card px-4 py-2 text-sm font-bold">
											Logout
										</button>
									</form>
									{/* phones reach the Account page from the menu; tablets, where the
									    header is tight, get an icon instead of the word */}
									<Link
										href="/account"
										className="hidden whitespace-nowrap rounded-full border border-border bg-card px-4 py-2 text-sm font-bold lg:inline-block"
									>
										Account
									</Link>
									<Button
										asChild
										variant="outline"
										size="icon"
										className="hidden rounded-full md:inline-flex lg:hidden"
									>
										<Link href="/account" aria-label="Account" title="Account">
											<User className="h-4 w-4" />
										</Link>
									</Button>
								</>
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
								artistPageHref={artistPageHref}
							/>
						</div>
					</div>

					<nav className="hidden flex-wrap items-center gap-x-8 gap-y-1 md:flex">
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
						{artistPageHref && (
							<Link
								href={artistPageHref}
								className="text-sm font-bold text-primary hover:underline"
							>
								Artist page
							</Link>
						)}
					</nav>
				</div>
			</div>
		</header>
	);
}
