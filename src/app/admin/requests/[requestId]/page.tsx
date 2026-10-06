import Link from 'next/link';
import { notFound } from 'next/navigation';

import LocalTime from '@/components/local-time';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCustomRequest } from '@/db/custom-request-db';
import {
	budgetLabel,
	formatNeededBy,
	parseRequestStatus,
	STATUS_LABELS,
} from '@/lib/custom-request-rules';
import StatusButtons from './status-buttons';

type Props = { params: { requestId: string } };

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
	<div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
		<dt className="text-sm text-muted-foreground sm:w-32 sm:flex-shrink-0">{label}</dt>
		<dd className="min-w-0 break-words">{children}</dd>
	</div>
);

export default async function AdminRequestPage({ params }: Props) {
	const request = await getCustomRequest(params.requestId);
	if (!request) notFound();
	const status = parseRequestStatus(request.status) ?? 'NEW';
	// a phone number as a tel: link: just the digits and a leading +
	const telHref = request.phone ? `tel:${request.phone.replace(/[^\d+]/g, '')}` : null;

	return (
		<main className="mx-auto flex max-w-3xl flex-col gap-6">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="font-display text-3xl font-semibold">Custom art request</h1>
				<Link href="/admin/requests" className="text-sm text-primary">
					Back to requests
				</Link>
			</header>

			<Card className="shadow-warm-sm">
				<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
					<CardTitle className="break-words font-display text-xl">{request.name}</CardTitle>
					<Badge
						variant={status === 'NEW' ? 'default' : status === 'REPLIED' ? 'secondary' : 'outline'}
					>
						{STATUS_LABELS[status]}
					</Badge>
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					<dl className="flex flex-col gap-3">
						<Row label="Received">
							<LocalTime value={request.createdAt} />
						</Row>
						{request.email && (
							<Row label="Email">
								<a href={`mailto:${encodeURIComponent(request.email)}`} className="break-all text-primary underline">
									{request.email}
								</a>
							</Row>
						)}
						{request.phone && telHref && (
							<Row label="Phone">
								<a href={telHref} className="text-primary underline">
									{request.phone}
								</a>
							</Row>
						)}
						{request.preferredContact && (
							<Row label="Prefers">
								{request.preferredContact === 'PHONE' ? 'Phone' : 'Email'}
							</Row>
						)}
						{request.budget && <Row label="Budget">{budgetLabel(request.budget)}</Row>}
						{request.neededBy && (
							<Row label="Needed by">{formatNeededBy(request.neededBy)}</Row>
						)}
						{request.userId && (
							<Row label="Account">
								<Link
									href={`/admin/customers/${request.userId}`}
									className="text-primary underline"
								>
									View their customer page
								</Link>
							</Row>
						)}
					</dl>
					<section aria-labelledby="request-text" className="flex flex-col gap-2">
						<h2 id="request-text" className="text-sm font-semibold text-muted-foreground">
							What they&apos;re looking for
						</h2>
						<p className="whitespace-pre-wrap break-words">{request.description}</p>
					</section>
					<div className="flex flex-col gap-2 border-t border-border pt-4">
						<p className="text-sm text-muted-foreground">
							Mark it Replied once you&apos;ve been in touch, and Closed when it&apos;s
							done (made, or not going ahead).
						</p>
						<StatusButtons requestId={request.id} status={status} />
					</div>
				</CardContent>
			</Card>
		</main>
	);
}
