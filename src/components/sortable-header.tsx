'use client';

import { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props<TData, TValue> = {
	column: Column<TData, TValue>;
	label: string;
	// which edge the column's content lines up with
	align?: 'left' | 'center' | 'right';
};

export default function SortableHeader<TData, TValue>({
	column,
	label,
	align = 'left',
}: Props<TData, TValue>) {
	const sorted = column.getIsSorted();

	const button = (
		<Button
			variant="ghost"
			className={cn(
				'h-8 px-4',
				align === 'left' && '-ml-4',
				align === 'right' && '-mr-4'
			)}
			onClick={column.getToggleSortingHandler()}
			aria-label={`Sort by ${label}`}
		>
			{label}
			{sorted === 'asc' ? (
				<ArrowUp className="ml-2 h-4 w-4" />
			) : sorted === 'desc' ? (
				<ArrowDown className="ml-2 h-4 w-4" />
			) : (
				<ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
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
