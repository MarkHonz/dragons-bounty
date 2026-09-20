import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

export type TotalRow = {
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

// The row for a discount code, or nothing when no code was used. A code that took
// money off shows the amount; one that only made shipping free says so.
export const discountRows = ({
	discountCode,
	discountInCents,
}: {
	discountCode?: string | null;
	discountInCents?: number | null;
}): TotalRow[] =>
	discountCode
		? [
				{
					label: `Discount (${discountCode})`,
					value:
						discountInCents && discountInCents > 0
							? `-${formatCurrency(discountInCents / 100)}`
							: 'Free shipping',
				},
			]
		: [];
