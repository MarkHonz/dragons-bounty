'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { refundOrderAction } from '@/actions/order-actions';
import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/formatters';

type Props = {
	orderId: string;
	totalInCents: number;
	// false for old orders that have no card payment on record
	hasStripePayment: boolean;
	// shipped goods may never come back, so restocking starts unticked for them
	shipped: boolean;
};

export default function RefundOrderForm({
	orderId,
	totalInCents,
	hasStripePayment,
	shipped,
}: Props) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [restock, setRestock] = useState(!shipped);
	const total = formatCurrency(totalInCents / 100);

	return (
		<div className="flex w-full flex-col items-start gap-3">
			<label className="flex items-center gap-2 text-sm font-semibold">
				<Checkbox
					checked={restock}
					onCheckedChange={(checked) => setRestock(checked === true)}
				/>
				Return items to stock
			</label>
			<p className="text-sm text-muted-foreground">
				{hasStripePayment
					? `Refunds the full ${total} (items, shipping and tax) to the customer's card and emails them. This can't be undone.`
					: "This order has no card payment on record, so no money moves. It is only marked refunded here; refund the customer yourself. This can't be undone."}
			</p>
			<Button
				type="button"
				variant="destructive"
				className="rounded-full"
				onClick={() => setOpen(true)}
			>
				{hasStripePayment ? `Refund ${total}` : 'Mark as refunded'}
			</Button>
			<ConfirmDeleteDialog
				open={open}
				onOpenChange={setOpen}
				title={hasStripePayment ? `Refund ${total}?` : 'Mark this order as refunded?'}
				description={
					hasStripePayment
						? `The full ${total} goes back to the customer's card${restock ? ', and the items are returned to stock' : ''}. This can't be undone.`
						: `No money moves. The order is marked refunded${restock ? ' and the items are returned to stock' : ''}. This can't be undone.`
				}
				confirmLabel={hasStripePayment ? 'Refund' : 'Mark as refunded'}
				pendingLabel="Refunding…"
				onConfirm={async () => {
					const result = await refundOrderAction(orderId, restock);
					if (!result.success) {
						return result.errors.join(' ');
					}
					router.refresh();
					return null;
				}}
			/>
		</div>
	);
}
