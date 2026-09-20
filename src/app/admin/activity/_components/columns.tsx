'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';

import LocalTime from '@/components/local-time';
import SortableHeader from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';
import {
	ACTIVITY_AREA_LABELS,
	type ActivityArea,
	type ActivityRow,
} from '@/db/activity-db';

const areaLabel = (area: string) =>
	ACTIVITY_AREA_LABELS[area as ActivityArea] ?? area;

const who = (row: ActivityRow) => row.actorName || row.actorEmail;

export const columns: ColumnDef<ActivityRow>[] = [
	{
		accessorKey: 'createdAt',
		header: ({ column }) => <SortableHeader column={column} label="When" />,
		sortingFn: 'datetime',
		// phones: shown under the description instead
		meta: { className: 'hidden sm:table-cell' },
		cell: ({ row }) => (
			<span className="whitespace-nowrap">
				<LocalTime value={row.original.createdAt} />
			</span>
		),
	},
	{
		id: 'summary',
		accessorFn: (row) => row.summary,
		header: ({ column }) => <SortableHeader column={column} label="What" />,
		sortingFn: 'alphanumeric',
		cell: ({ row }) => {
			const entry = row.original;
			return (
				<div className="break-words">
					{entry.orderId ? (
						<Link
							href={`/admin/orders/${entry.orderId}`}
							className="font-medium text-primary"
						>
							{entry.summary}
						</Link>
					) : (
						<span className="font-medium">{entry.summary}</span>
					)}
					{/* the When and Who columns are hidden on phones */}
					<p className="text-xs text-muted-foreground sm:hidden">
						<LocalTime value={entry.createdAt} /> · {who(entry)}
					</p>
				</div>
			);
		},
	},
	{
		id: 'area',
		accessorFn: (row) => areaLabel(row.area),
		header: ({ column }) => <SortableHeader column={column} label="Area" />,
		cell: ({ row }) => (
			<Badge variant="outline" className="whitespace-nowrap px-2">
				{areaLabel(row.original.area)}
			</Badge>
		),
	},
	{
		id: 'who',
		// name and email together, so the search box finds either
		accessorFn: (row) => `${row.actorName ?? ''} ${row.actorEmail}`.trim(),
		header: ({ column }) => <SortableHeader column={column} label="Who" />,
		sortingFn: 'alphanumeric',
		meta: { className: 'hidden sm:table-cell' },
		cell: ({ row }) => (
			<div className="break-words">
				{who(row.original)}
				{row.original.actorName && (
					<p className="break-all text-xs text-muted-foreground">
						{row.original.actorEmail}
					</p>
				)}
			</div>
		),
	},
];
