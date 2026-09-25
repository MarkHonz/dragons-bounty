'use client';

import { useState } from 'react';

import type { DailySales } from '@/lib/sales-stats';
import { formatCurrency } from '@/lib/formatters';

// "2026-09-03" -> "Sep 3". The key is already the shop's calendar day, so it
// is formatted as a plain date (UTC) to avoid shifting it a day either way.
const shortDate = (day: string, long = false) => {
	const [year, month, date] = day.split('-').map(Number);
	return new Intl.DateTimeFormat('en-US', {
		timeZone: 'UTC',
		month: 'short',
		day: 'numeric',
		...(long ? { weekday: 'short' } : {}),
	}).format(new Date(Date.UTC(year, month - 1, date)));
};

const dollars = (cents: number) => formatCurrency(cents / 100);

// A clean top for the axis: 1, 2 or 5 times a power of ten, split in 4.
const niceScale = (maxCents: number) => {
	const max = Math.max(maxCents / 100, 1);
	const rough = max / 4;
	const power = 10 ** Math.floor(Math.log10(rough));
	const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? rough;
	return { top: step * 4 * 100, ticks: [0, 1, 2, 3, 4].map((i) => step * i * 100) };
};

const tickLabel = (cents: number) => {
	const value = cents / 100;
	if (value >= 1000) return `$${(value / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k`;
	return `$${value.toLocaleString('en-US')}`;
};

// Daily sales for the last 30 shop days as bars, one series. Each day's column
// is its own hover/focus target and shows the day, amount and orders; the
// same numbers are in the table below for exact figures and screen readers.
export default function SalesChart({ daily }: { daily: DailySales[] }) {
	const [active, setActive] = useState<number | null>(null);
	const maxCents = Math.max(0, ...daily.map((d) => d.netInCents));
	const { top, ticks } = niceScale(maxCents);
	const best = daily.reduce<DailySales | null>(
		(winner, d) => (d.netInCents > 0 && (!winner || d.netInCents > winner.netInCents) ? d : winner),
		null
	);
	const shown = active != null ? daily[active] : null;
	// label a few dates under the axis: the ends, and each week between
	const labelled = new Set([0, 7, 14, 21, daily.length - 1]);

	return (
		<div className="flex flex-col gap-3">
			<p className="text-sm text-muted-foreground">
				{best
					? `Best day: ${shortDate(best.day)}, ${dollars(best.netInCents)}.`
					: 'No sales in the last 30 days.'}
			</p>
			<div className="flex gap-2">
				{/* y axis: clean round values */}
				<div className="relative h-48 w-12 flex-shrink-0 text-right text-xs tabular-nums text-muted-foreground">
					{ticks.map((tick) => (
						<span
							key={tick}
							className="absolute right-0"
							style={{ bottom: `${(tick / top) * 100}%`, transform: 'translateY(50%)' }}
						>
							{tickLabel(tick)}
						</span>
					))}
				</div>
				<div className="relative min-w-0 flex-1">
					<div className="relative h-48" onPointerLeave={() => setActive(null)}>
						{/* hairline gridlines, recessive */}
						{ticks.map((tick) => (
							<div
								key={tick}
								aria-hidden="true"
								className="absolute inset-x-0 border-t border-border"
								style={{ bottom: `${(tick / top) * 100}%` }}
							/>
						))}
						<ul
							className="absolute inset-0 grid"
							style={{ gridTemplateColumns: `repeat(${daily.length}, minmax(0, 1fr))` }}
							aria-label="Daily sales, last 30 days"
						>
							{daily.map((d, index) => {
								const height = top > 0 ? (d.netInCents / top) * 100 : 0;
								return (
									<li key={d.day} className="flex h-full">
										<button
											type="button"
											className="group flex h-full w-full items-end justify-center px-px focus-visible:outline-none"
											aria-label={`${shortDate(d.day, true)}: ${dollars(d.netInCents)}, ${d.orders} ${d.orders === 1 ? 'order' : 'orders'}`}
											onPointerEnter={() => setActive(index)}
											onFocus={() => setActive(index)}
											onBlur={() => setActive(null)}
										>
											<span
												aria-hidden="true"
												className={`block w-full max-w-[24px] rounded-t bg-chart-1 transition-opacity ${
													active != null && active !== index ? 'opacity-50' : ''
												} group-focus-visible:ring-2 group-focus-visible:ring-ring`}
												// a sale too small to see still gets a sliver, so it isn't mistaken for none
												style={{ height: d.netInCents > 0 ? `max(${height}%, 2px)` : 0 }}
											/>
										</button>
									</li>
								);
							})}
						</ul>
						{shown && (
							<div
								role="status"
								className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md"
								style={{
									left: `${((active! + 0.5) / daily.length) * 100}%`,
								}}
							>
								<span className="block text-sm font-semibold text-foreground">
									{dollars(shown.netInCents)}
								</span>
								<span className="text-muted-foreground">
									{shortDate(shown.day, true)} &middot; {shown.orders}{' '}
									{shown.orders === 1 ? 'order' : 'orders'}
								</span>
							</div>
						)}
					</div>
					{/* x axis: a few dates, fewer on phones */}
					<div className="relative mt-1 h-4 text-xs text-muted-foreground">
						{daily.map((d, index) =>
							labelled.has(index) ? (
								<span
									key={d.day}
									className={`absolute -translate-x-1/2 whitespace-nowrap ${
										index === 7 || index === 21 ? 'hidden sm:inline' : ''
									}`}
									style={{ left: `${((index + 0.5) / daily.length) * 100}%` }}
								>
									{index === daily.length - 1 ? 'Today' : shortDate(d.day)}
								</span>
							) : null
						)}
					</div>
				</div>
			</div>
			<details className="text-sm">
				<summary className="cursor-pointer text-muted-foreground hover:text-foreground">
					Show as table
				</summary>
				<div className="mt-2 max-h-72 overflow-y-auto">
					<table className="w-full tabular-nums">
						<thead>
							<tr className="border-b border-border text-left text-muted-foreground">
								<th className="py-1 font-medium">Day</th>
								<th className="py-1 text-right font-medium">Orders</th>
								<th className="py-1 text-right font-medium">Sales</th>
							</tr>
						</thead>
						<tbody>
							{[...daily].reverse().map((d) => (
								<tr key={d.day} className="border-b border-border last:border-0">
									<td className="py-1">{shortDate(d.day, true)}</td>
									<td className="py-1 text-right">{d.orders}</td>
									<td className="py-1 text-right">{dollars(d.netInCents)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</details>
		</div>
	);
}
