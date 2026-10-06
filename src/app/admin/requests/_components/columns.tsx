'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { StickyNote } from 'lucide-react';

import SortableHeader from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';
import type { CustomRequestRow } from '@/db/custom-request-db';
import {
	budgetLabel,
	formatNeededBy,
	parseRequestStatus,
	STATUS_LABELS,
} from '@/lib/custom-request-rules';

// the time is formatted in the reader's own time zone; suppressHydrationWarning
// keeps React from complaining that the server's differs
const When = ({ value }: { value: Date }) => (
	<time dateTime={new Date(value).toISOString()} suppressHydrationWarning>
		{new Date(value).toLocaleString()}
	</time>
);

const statusBadge = (status: string) => {
	const parsed = parseRequestStatus(status) ?? 'NEW';
	return (
		<Badge
			variant={parsed === 'NEW' ? 'default' : parsed === 'REPLIED' ? 'secondary' : 'outline'}
			className="whitespace-nowrap"
		>
			{STATUS_LABELS[parsed]}
		</Badge>
	);
};

const PREVIEW = 90;

export const columns: ColumnDef<CustomRequestRow>[] = [
	{
		accessorKey: 'createdAt',
		header: ({ column }) => <SortableHeader column={column} label="Received" />,
		sortingFn: 'datetime',
		meta: { className: 'hidden sm:table-cell' },
		cell: ({ row }) => <When value={row.original.createdAt} />,
	},
	{
		accessorKey: 'name',
		header: ({ column }) => <SortableHeader column={column} label="From" />,
		sortingFn: 'alphanumeric',
		cell: ({ row }) => (
			<div className="min-w-0 break-words">
				<Link
					href={`/admin/requests/${row.original.id}`}
					className="font-semibold text-primary"
				>
					{row.original.name}
				</Link>
				{/* admins can see at a glance which requests have notes */}
				{row.original.noteCount > 0 && (
					<span
						className="ml-2 inline-flex items-center gap-0.5 align-middle text-xs text-muted-foreground"
						title={`${row.original.noteCount} ${row.original.noteCount === 1 ? 'note' : 'notes'}`}
					>
						<StickyNote className="h-3.5 w-3.5" aria-hidden="true" />
						<span aria-hidden="true">{row.original.noteCount}</span>
						<span className="sr-only">
							{row.original.noteCount === 1
								? '1 note'
								: `${row.original.noteCount} notes`}
						</span>
					</span>
				)}
				{row.original.email && (
					<p className="break-all text-xs text-muted-foreground">{row.original.email}</p>
				)}
				{row.original.phone && (
					<p className="text-xs text-muted-foreground">{row.original.phone}</p>
				)}
				{/* phones: the received date and status ride along here */}
				<p className="text-xs text-muted-foreground sm:hidden">
					<When value={row.original.createdAt} />
				</p>
			</div>
		),
	},
	{
		// never shown on its own (the From column shows it): only so the search
		// box can find an email or phone number
		id: 'contact',
		accessorFn: (row) => `${row.email ?? ''} ${row.phone ?? ''}`,
		header: () => null,
		cell: () => null,
		enableSorting: false,
		meta: { className: 'hidden' },
	},
	{
		accessorKey: 'description',
		header: 'Request',
		enableSorting: false,
		meta: { className: 'hidden md:table-cell' },
		cell: ({ row }) => {
			const text = row.original.description.replace(/\s+/g, ' ');
			const extras = [
				budgetLabel(row.original.budget),
				row.original.neededBy ? `by ${formatNeededBy(row.original.neededBy)}` : null,
			].filter(Boolean);
			return (
				<div className="max-w-md break-words text-sm">
					{text.length > PREVIEW ? `${text.slice(0, PREVIEW - 1)}…` : text}
					{extras.length > 0 && (
						<p className="text-xs text-muted-foreground">{extras.join(' · ')}</p>
					)}
				</div>
			);
		},
	},
	{
		accessorKey: 'status',
		header: ({ column }) => <SortableHeader column={column} label="Status" />,
		// New first, then Replied, then Closed
		sortingFn: (a, b) =>
			['NEW', 'REPLIED', 'CLOSED'].indexOf(a.original.status) -
			['NEW', 'REPLIED', 'CLOSED'].indexOf(b.original.status),
		sortDescFirst: false,
		cell: ({ row }) => statusBadge(row.original.status),
	},
];
