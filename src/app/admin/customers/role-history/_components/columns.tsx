'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowRight } from 'lucide-react';

import SortableHeader from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';
import type { RoleChangeRow } from '@/db/user-db';

const roleLabel = (role: string) => (role === 'ADMIN' ? 'Admin' : 'Customer');

// the time is formatted in the reader's own time zone, so it can differ from the
// server's; suppressHydrationWarning keeps React from complaining about that
const When = ({ value }: { value: Date }) => (
	<time dateTime={new Date(value).toISOString()} suppressHydrationWarning>
		{new Date(value).toLocaleString()}
	</time>
);

const byLabel = (row: RoleChangeRow) => row.actorName || row.actorEmail;

export const columns: ColumnDef<RoleChangeRow>[] = [
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
					{/* the When and Changed by columns are hidden on phones */}
					<p className="text-xs text-muted-foreground sm:hidden">
						<When value={change.createdAt} /> · by {byLabel(change)}
					</p>
				</div>
			);
		},
	},
	{
		id: 'change',
		accessorFn: (row) => `${row.fromRole}>${row.toRole}`,
		header: ({ column }) => <SortableHeader column={column} label="Change" />,
		cell: ({ row }) => (
			<div className="flex flex-wrap items-center gap-1.5">
				<Badge variant="outline" className="whitespace-nowrap px-2">
					{roleLabel(row.original.fromRole)}
				</Badge>
				<ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-label="to" />
				<Badge
					variant={row.original.toRole === 'ADMIN' ? 'default' : 'secondary'}
					className="whitespace-nowrap px-2"
				>
					{roleLabel(row.original.toRole)}
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
