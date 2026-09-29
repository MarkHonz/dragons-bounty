'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowRight } from 'lucide-react';

import SortableHeader from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';

// One row, whether it came from an admin change or an artist change: what the
// Change column shows is already reduced to a from/to label pair, so the table
// doesn't need to know the difference beyond the Type badge.
export type HistoryRow = {
	id: string;
	createdAt: Date;
	kind: 'ROLE' | 'ARTIST';
	targetId: string | null;
	targetEmail: string;
	targetName: string | null;
	fromLabel: string;
	toLabel: string;
	// how "elevated" the change reads: default = admin/became an artist,
	// secondary/outline = a step down. Set once when the row is built.
	toVariant: 'default' | 'secondary' | 'outline';
	actorEmail: string;
	actorName: string | null;
};

// the time is formatted in the reader's own time zone, so it can differ from the
// server's; suppressHydrationWarning keeps React from complaining about that
const When = ({ value }: { value: Date }) => (
	<time dateTime={new Date(value).toISOString()} suppressHydrationWarning>
		{new Date(value).toLocaleString()}
	</time>
);

const byLabel = (row: HistoryRow) => row.actorName || row.actorEmail;

export const columns: ColumnDef<HistoryRow>[] = [
	{
		accessorKey: 'createdAt',
		header: ({ column }) => <SortableHeader column={column} label="When" />,
		sortingFn: 'datetime',
		// phones: shown under the person instead
		meta: { className: 'hidden sm:table-cell' },
		cell: ({ row }) => <When value={row.original.createdAt} />,
	},
	{
		id: 'person',
		// name and email together, so both sorting and the search box use them
		accessorFn: (row) => `${row.targetName ?? ''} ${row.targetEmail}`.trim(),
		header: ({ column }) => <SortableHeader column={column} label="Person" />,
		sortingFn: 'alphanumeric',
		cell: ({ row }) => {
			const change = row.original;
			const title = change.targetName || change.targetEmail;
			return (
				<div className="break-words">
					{change.targetId ? (
						<Link
							href={`/admin/customers/${change.targetId}`}
							className="font-semibold text-primary"
						>
							{title}
						</Link>
					) : (
						<span className="font-semibold">{title}</span>
					)}
					{change.targetName && (
						<p className="break-all text-xs text-muted-foreground">
							{change.targetEmail}
						</p>
					)}
					{!change.targetId && (
						<p className="text-xs text-muted-foreground">Account deleted</p>
					)}
					{/* the Type, When and Changed by columns are hidden on phones */}
					<p className="text-xs text-muted-foreground sm:hidden">
						{change.kind === 'ROLE' ? 'Admin' : 'Artist'} · <When value={change.createdAt} />{' '}
						· by {byLabel(change)}
					</p>
				</div>
			);
		},
	},
	{
		id: 'type',
		accessorFn: (row) => (row.kind === 'ROLE' ? 'Admin' : 'Artist'),
		header: ({ column }) => <SortableHeader column={column} label="Type" />,
		sortingFn: 'alphanumeric',
		meta: { className: 'hidden sm:table-cell' },
		cell: ({ row }) => (
			<Badge
				variant={row.original.kind === 'ROLE' ? 'default' : 'secondary'}
				className="whitespace-nowrap px-2"
			>
				{row.original.kind === 'ROLE' ? 'Admin' : 'Artist'}
			</Badge>
		),
	},
	{
		id: 'change',
		accessorFn: (row) => `${row.fromLabel}>${row.toLabel}`,
		header: ({ column }) => <SortableHeader column={column} label="Change" />,
		cell: ({ row }) => (
			<div className="flex flex-wrap items-center gap-1.5">
				<Badge variant="outline" className="whitespace-nowrap px-2">
					{row.original.fromLabel}
				</Badge>
				<ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-label="to" />
				<Badge variant={row.original.toVariant} className="whitespace-nowrap px-2">
					{row.original.toLabel}
				</Badge>
			</div>
		),
	},
	{
		id: 'actor',
		// name and email together, so the search box finds either
		accessorFn: (row) => `${row.actorName ?? ''} ${row.actorEmail}`.trim(),
		header: ({ column }) => (
			<SortableHeader column={column} label="Changed by" />
		),
		sortingFn: 'alphanumeric',
		meta: { className: 'hidden sm:table-cell' },
		cell: ({ row }) => (
			<div className="break-words">
				{byLabel(row.original)}
				{row.original.actorName && (
					<p className="break-all text-xs text-muted-foreground">
						{row.original.actorEmail}
					</p>
				)}
			</div>
		),
	},
];
