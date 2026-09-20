'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useHydrated } from '@/lib/use-hydrated';

// "Export CSV": asks which days to include (or none, for every order), then
// downloads the file. It is a plain GET form, so the browser handles the download
// itself, and what is exported follows the filter tab the admin is on.
export default function ExportOrdersDialog({
	status,
	statusLabel,
}: {
	// the filter tab's value in the URL, when one is selected
	status?: string;
	// the same tab as words: "All", "Needs shipping"...
	statusLabel: string;
}) {
	const hydrated = useHydrated();
	const [open, setOpen] = useState(false);
	const [from, setFrom] = useState('');
	const [to, setTo] = useState('');
	// The days are the admin's own days, so their time zone goes along with them
	// and the server works out exactly when each day starts.
	const [timeZone, setTimeZone] = useState('');
	useEffect(() => {
		try {
			setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
		} catch {
			setTimeZone('');
		}
	}, []);

	const backwards = from !== '' && to !== '' && from > to;

	return (
		<>
			<Button
				type="button"
				variant="outline"
				className="rounded-full"
				disabled={!hydrated}
				onClick={() => setOpen(true)}
			>
				Export CSV
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<form
						method="get"
						action="/admin/orders/export"
						className="flex flex-col gap-4"
						// the browser starts the download; close the box once it has
						onSubmit={() => setTimeout(() => setOpen(false), 300)}
					>
						<DialogHeader>
							<DialogTitle>Export orders</DialogTitle>
							<DialogDescription>
								Downloads the orders in the &ldquo;{statusLabel}&rdquo; tab as a
								CSV file. Leave the dates blank to include every order.
							</DialogDescription>
						</DialogHeader>
						{status && <input type="hidden" name="status" value={status} />}
						<input type="hidden" name="tz" value={timeZone} />
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<label className="flex flex-col gap-1.5 text-sm font-medium">
								From
								<Input
									type="date"
									name="from"
									value={from}
									onChange={(event) => setFrom(event.target.value)}
								/>
							</label>
							<label className="flex flex-col gap-1.5 text-sm font-medium">
								To
								<Input
									type="date"
									name="to"
									value={to}
									onChange={(event) => setTo(event.target.value)}
								/>
							</label>
						</div>
						<p className="text-xs text-muted-foreground">
							Both days are included, and days are counted in your own time zone
							{timeZone ? ` (${timeZone})` : ''}.
						</p>
						{backwards && (
							<p className="text-sm font-medium text-destructive" role="alert">
								The start date is after the end date.
							</p>
						)}
						<DialogFooter className="gap-2 sm:gap-0">
							<Button
								type="button"
								variant="outline"
								onClick={() => setOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={!hydrated || backwards}>
								Download
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
}
