'use client';

import { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props<TData, TValue> = {
	column: Column<TData, TValue>;
	label: string;
	// a shorter label for phones, where header space is tight
	shortLabel?: string;
	// which edge the column's content lines up with
	align?: 'left' | 'center' | 'right';
};

export default function SortableHeader<TData, TValue>({
	column,
	label,
	shortLabel,
	align = 'left',
}: Props<TData, TValue>) {
	const sorted = column.getIsSorted();

	const button = (
		<Button
			variant="ghost"
			className={cn(
				// the negative margin cancels the cell padding (tighter on phones)
				'h-8 px-1.5 sm:px-4',
				align === 'left' && '-ml-1.5 sm:-ml-4',
				align === 'right' && '-mr-1.5 sm:-mr-4'
			)}
			onClick={column.getToggleSortingHandler()}
			aria-label={`Sort by ${label}`}
		>
			{shortLabel ? (
				<>
					<span className="sm:hidden">{shortLabel}</span>
					<span className="hidden sm:inline">{label}</span>
				</>
			) : (
				label
			)}
			{sorted === 'asc' ? (
				<ArrowUp className="ml-1 h-4 w-4 sm:ml-2" />
			) : sorted === 'desc' ? (
				<ArrowDown className="ml-1 h-4 w-4 sm:ml-2" />
			) : (
				<ArrowUpDown className="ml-1 h-4 w-4 opacity-50 sm:ml-2" />
			)}
		</Button>
	);

	if (align === 'left') return button;

	return (
		<div className={align === 'right' ? 'flex justify-end' : 'flex justify-center'}>
			{button}
		</div>
	);
}
