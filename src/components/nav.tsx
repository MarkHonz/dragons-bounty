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
		<nav className="flex flex-wrap justify-center gap-x-1 border-t border-border bg-muted/60 px-2 sm:px-4">
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
				'px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:text-primary sm:px-4 sm:py-3',
				pathname === props.href && 'text-primary'
			)}
		/>
	);
}
