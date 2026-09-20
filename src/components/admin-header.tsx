import Image from 'next/image';
import Link from 'next/link';
import { Nav, NavLink } from '@/components/nav';
import { userLogout } from '@/actions/user-actions';

export default function AdminHeader() {
	return (
		<header className="border-b border-border bg-card">
			<div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-2 sm:gap-6 sm:px-8">
				<Link href="/admin" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
					<Image
						src="/images/CoinLogo.png"
						alt="Dragon's Bounty coin logo"
						width={84}
						height={84}
						className="h-14 w-14 flex-shrink-0 object-contain sm:h-[84px] sm:w-[84px]"
					/>
					<span className="font-display text-sm font-semibold leading-tight sm:whitespace-nowrap sm:text-base">
						Dragon&apos;s Bounty Admin
					</span>
				</Link>
				<form action={userLogout}>
					<button className="flex-shrink-0 whitespace-nowrap text-sm font-bold text-muted-foreground hover:text-foreground">
						Sign Out
					</button>
				</form>
			</div>
			<Nav>
				<NavLink href="/admin">Dashboard</NavLink>
				<NavLink href="/admin/products">Products</NavLink>
				<NavLink href="/admin/category">Categories</NavLink>
				<NavLink href="/admin/customers">Customers</NavLink>
				<NavLink href="/admin/orders">Orders</NavLink>
				<NavLink href="/admin/discounts">Discounts</NavLink>
				<NavLink href="/admin/shipping">Shipping</NavLink>
				<NavLink href="/admin/activity">Activity</NavLink>
			</Nav>
		</header>
	);
}
