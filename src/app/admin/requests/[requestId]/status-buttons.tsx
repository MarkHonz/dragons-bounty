'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { setCustomRequestStatusAction } from '@/actions/custom-request-actions';
import { Button } from '@/components/ui/button';
import { REQUEST_STATUSES, type RequestStatus, STATUS_LABELS } from '@/lib/custom-request-rules';
import { useHydrated } from '@/lib/use-hydrated';

// One button for each status the request isn't in.
export default function StatusButtons({
	requestId,
	status,
}: {
	requestId: string;
	status: RequestStatus;
}) {
	const router = useRouter();
	const hydrated = useHydrated();
	const [saving, setSaving] = useState<RequestStatus | null>(null);

	return (
		<div className="flex flex-wrap gap-2">
			{REQUEST_STATUSES.filter((option) => option !== status).map((option) => (
				<Button
					key={option}
					type="button"
					variant={option === 'REPLIED' ? 'default' : 'outline'}
					className="rounded-full"
					disabled={!hydrated || saving !== null}
					onClick={async () => {
						setSaving(option);
						const result = await setCustomRequestStatusAction(requestId, option);
						setSaving(null);
						if (!result.ok) {
							toast.error(result.message);
							return;
						}
						toast.success(result.message);
						router.refresh();
					}}
				>
					{saving === option
						? 'Saving…'
						: option === 'NEW'
							? 'Mark as new'
							: `Mark as ${STATUS_LABELS[option].toLowerCase()}`}
				</Button>
			))}
		</div>
	);
}
