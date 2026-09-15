import Image from 'next/image';
import Link from 'next/link';
import { Nav, NavLink } from '@/components/nav';
import { userLogout } from '@/actions/user-actions';

export default function AdminHeader() {
	return (
		<header className="border-b border-border bg-card">
			<div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-5 py-2 sm:px-8">
				<Link href="/admin" className="flex flex-shrink-0 items-center gap-2.5">
					<Image
						src="/images/CoinLogo.png"
						alt="Dragon's Bounty coin logo"
						width={84}
						height={84}
						className="h-[84px] w-[84px] object-contain"
					/>
					<span className="whitespace-nowrap font-display text-base font-semibold">
						Dragon&apos;s Bounty Admin
					</span>
				</Link>
				<form action={userLogout}>
					<button className="whitespace-nowrap text-sm font-bold text-muted-foreground hover:text-foreground">
						Sign Out
					</button>
				</form>
			</div>
			<Nav>
				<NavLink href="/admin">Dashboard</NavLink>
				<NavLink href="/admin/products">Products</NavLink>
				<NavLink href="/admin/category">Categories</NavLink>
				<NavLink href="/admin/customers">Customers</NavLink>
				<NavLink href="/admin/orders">Sales</NavLink>
				<NavLink href="/admin/photos">Photos</NavLink>
			</Nav>
		</header>
	);
}
