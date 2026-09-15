import { cn } from '@/lib/utils';

type TotalRow = {
	label: string;
	value: string;
	emphasis?: boolean;
};

export default function OrderTotals({ rows }: { rows: TotalRow[] }) {
	return (
		<div className="flex flex-col gap-2">
			{rows.map((row) => (
				<div
					key={row.label}
					className={cn(
						'flex items-baseline justify-between text-sm',
						row.emphasis && 'border-t border-border pt-2 text-base'
					)}
				>
					<span
						className={row.emphasis ? 'font-bold' : 'text-muted-foreground'}
					>
						{row.label}
					</span>
					<span className={row.emphasis ? 'font-extrabold' : 'font-semibold'}>
						{row.value}
					</span>
				</div>
			))}
		</div>
	);
}
