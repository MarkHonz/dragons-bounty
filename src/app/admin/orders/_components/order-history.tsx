import LocalTime from '@/components/local-time';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ActivityRow } from '@/db/activity-db';

// what admins have done to this one order, newest first
export default function OrderHistory({ entries }: { entries: ActivityRow[] }) {
	return (
		<Card className="w-full shadow-warm-sm">
			<CardHeader>
				<CardTitle className="font-display text-xl">History</CardTitle>
			</CardHeader>
			<CardContent className="text-sm">
				{entries.length === 0 ? (
					<p className="text-muted-foreground">Nothing recorded yet.</p>
				) : (
					<ul className="flex flex-col divide-y divide-border">
						{entries.map((entry) => (
							<li
								key={entry.id}
								className="flex flex-col gap-0.5 py-2 first:pt-0"
							>
								<p className="break-words">{entry.summary}</p>
								<p className="text-xs text-muted-foreground">
									{entry.actorName || entry.actorEmail} ·{' '}
									<LocalTime value={entry.createdAt} />
								</p>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
