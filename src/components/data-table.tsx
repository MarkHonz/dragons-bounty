'use client';

import { useEffect, useState } from 'react';
import {
	ColumnDef,
	FilterFn,
	PaginationState,
	SortingState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';

const PAGE_SIZE = 10;

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	// ids of the columns the search box looks in
	searchColumns: string[];
	searchPlaceholder?: string;
	// the sort the table starts with (default: unsorted, i.e. the order of `data`)
	initialSorting?: SortingState;
}

export function DataTable<TData, TValue>({
	columns,
	data,
	searchColumns,
	searchPlaceholder = 'Search…',
	initialSorting = [],
}: DataTableProps<TData, TValue>) {
	const [sorting, setSorting] = useState<SortingState>(initialSorting);
	const [globalFilter, setGlobalFilter] = useState('');
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: PAGE_SIZE,
	});

	const goToFirstPage = () =>
		setPagination((current) => ({ ...current, pageIndex: 0 }));

	// TanStack turns an accessor such as 'category.name' into the column id
	// 'category_name', so compare against the ids it will actually pass in
	const searchColumnIds = searchColumns.map((id) => id.replace('.', '_'));

	// only look at the chosen columns, so numbers like price or quantity don't match
	const searchFilter: FilterFn<TData> = (row, columnId, filterValue) => {
		if (!searchColumnIds.includes(columnId)) return false;
		const term = String(filterValue).trim().toLowerCase();
		if (!term) return true;
		return String(row.getValue(columnId) ?? '')
			.toLowerCase()
			.includes(term);
	};

	const table = useReactTable({
		data,
		columns,
		state: { sorting, globalFilter, pagination },
		onSortingChange: (updater) => {
			setSorting(updater);
			goToFirstPage();
		},
		onGlobalFilterChange: (updater) => {
			setGlobalFilter(updater);
			goToFirstPage();
		},
		onPaginationChange: setPagination,
		enableMultiSort: false,
		// keep the current page when the data refreshes (e.g. after a Deactivate)
		autoResetPageIndex: false,
		globalFilterFn: searchFilter,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	// if a delete empties the last page, step back to the new last page
	const pageCount = table.getPageCount();
	useEffect(() => {
		if (pageCount > 0 && pagination.pageIndex > pageCount - 1) {
			setPagination((current) => ({ ...current, pageIndex: pageCount - 1 }));
		}
	}, [pageCount, pagination.pageIndex]);

	const total = table.getFilteredRowModel().rows.length;
	const first = total === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
	const last = Math.min(total, (pagination.pageIndex + 1) * pagination.pageSize);

	return (
		<div className="flex flex-col gap-3">
			<Input
				type="search"
				value={globalFilter}
				onChange={(event) => table.setGlobalFilter(event.target.value)}
				placeholder={searchPlaceholder}
				aria-label="Search"
				className="max-w-sm"
			/>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									const sorted = header.column.getIsSorted();
									return (
										<TableHead
											key={header.id}
											aria-sort={
												sorted === 'asc'
													? 'ascending'
													: sorted === 'desc'
													? 'descending'
													: header.column.getCanSort()
													? 'none'
													: undefined
											}
										>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext()
												  )}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && 'selected'}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={columns.length} className="h-24 text-center">
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<div className="flex flex-wrap items-center justify-between gap-2 px-1">
				<p className="text-sm text-muted-foreground">
					Showing {first}&ndash;{last} of {total}
				</p>
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground">
						Page {pagination.pageIndex + 1} of {Math.max(pageCount, 1)}
					</span>
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						Previous
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						Next
					</Button>
				</div>
			</div>
		</div>
	);
}
