import { wrapEmailHtml, emailButtonHtml } from './shared';
import { formatCurrency } from '@/lib/formatters';

type RefundEmailProps = {
	name: string;
	orderId: string;
	refundedAmountInCents: number;
	orderUrl: string;
};

export const buildRefundEmail = ({
	name,
	orderId,
	refundedAmountInCents,
	orderUrl,
}: RefundEmailProps) => {
	const amount = formatCurrency(refundedAmountInCents / 100);
	const subject = `Your order has been refunded — #${orderId.slice(-8)}`;

	const html = wrapEmailHtml(`
		<p>Hi ${name},</p>
		<p>We've refunded <strong>${amount}</strong> for order #${orderId.slice(-8)} to your original payment method.</p>
		<p>It usually takes 5&ndash;10 business days to show up, depending on your bank.</p>
		${emailButtonHtml(orderUrl, 'View Your Order')}
	`);

	const text = `Hi ${name},\n\nWe've refunded ${amount} for order #${orderId.slice(-8)} to your original payment method.\n\nIt usually takes 5-10 business days to show up, depending on your bank.\n\nView your order: ${orderUrl}`;

	return { subject, html, text };
};
