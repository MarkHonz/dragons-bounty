import Link from 'next/link';

import { cn } from '@/lib/utils';

type FilterOption = {
	label: string;
	href: string;
	count: number;
	active: boolean;
};

// A row of link "tabs" for filtering a list through the URL, so a filtered view
// can be bookmarked or linked to (the dashboard does this).
export default function FilterTabs({
	label,
	options,
}: {
	label: string;
	options: FilterOption[];
}) {
	return (
		<nav aria-label={label} className="mb-4 flex flex-wrap gap-2">
			{options.map((option) => (
				<Link
					key={option.href}
					href={option.href}
					aria-current={option.active ? 'page' : undefined}
					className={cn(
						'flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
						option.active
							? 'border-primary bg-primary text-primary-foreground'
							: 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
					)}
				>
					{option.label}
					<span
						className={cn(
							'text-xs',
							option.active ? 'text-primary-foreground/80' : 'text-muted-foreground'
						)}
					>
						{option.count}
					</span>
				</Link>
			))}
		</nav>
	);
}
