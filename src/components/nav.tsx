'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ComponentProps } from 'react';

type NavProps = {
	children: React.ReactNode;
};

export function Nav({ children }: NavProps) {
	return (
		<nav className="flex justify-center gap-1 border-t border-border bg-muted/60 px-4">
			{children}
		</nav>
	);
}

export function NavLink(props: Omit<ComponentProps<typeof Link>, 'className'>) {
	const pathname = usePathname();
	return (
		<Link
			{...props}
			className={cn(
				'px-4 py-3 text-sm font-semibold text-muted-foreground hover:text-primary',
				pathname === props.href && 'text-primary'
			)}
		/>
	);
}
