'use client';

import Link from 'next/link';
import { Menu, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import ThemeToggle from '@/components/theme-toggle';

type NavItem = { href: string; label: string };

type Props = {
	navItems: NavItem[];
	isSignedIn: boolean;
	// set for artists: their own artist page
	artistPageHref?: string | null;
};

export default function MobileNav({ navItems, isSignedIn, artistPageHref }: Props) {
	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button
					variant="outline"
					size="icon"
					className="rounded-full md:hidden"
					aria-label="Open menu"
				>
					<Menu className="h-4 w-4" />
				</Button>
			</SheetTrigger>
			<SheetContent side="right" className="flex flex-col gap-6 bg-card">
				<SheetHeader>
					<SheetTitle className="font-display">Dragon&apos;s Bounty</SheetTitle>
				</SheetHeader>
				<Link
					href="/search"
					className="flex items-center gap-2 rounded-md px-3 py-2 text-base font-semibold text-foreground hover:bg-muted"
				>
					<Search className="h-4 w-4" />
					Search
				</Link>
				<nav className="flex flex-col gap-1">
					{navItems.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							className="rounded-md px-3 py-2 text-base font-semibold text-foreground hover:bg-muted"
						>
							{item.label}
						</Link>
					))}
				</nav>
				<Separator />
				<div className="flex items-center justify-between px-3">
					<span className="text-base font-semibold text-foreground">Theme</span>
					<ThemeToggle />
				</div>
				<Link
					href="/sign-in"
					className="rounded-md px-3 py-2 text-base font-semibold text-foreground hover:bg-muted"
				>
					{isSignedIn ? 'Account' : 'Sign In'}
				</Link>
				{artistPageHref && (
					<Link
						href={artistPageHref}
						className="rounded-md px-3 py-2 text-base font-semibold text-foreground hover:bg-muted"
					>
						Artist page
					</Link>
				)}
			</SheetContent>
		</Sheet>
	);
}
