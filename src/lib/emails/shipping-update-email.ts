import { wrapEmailHtml, emailButtonHtml, escapeHtml } from './shared';

type ShippingUpdateEmailProps = {
	name: string;
	orderId: string;
	trackingNumber: string | null;
	orderUrl: string;
};

export const buildShippingUpdateEmail = ({
	name,
	orderId,
	trackingNumber,
	orderUrl,
}: ShippingUpdateEmailProps) => {
	const subject = `Your order has shipped — #${orderId.slice(-8)}`;

	const html = wrapEmailHtml(`
		<p>Hi ${escapeHtml(name)},</p>
		<p>Good news &mdash; your order is on its way!</p>
		${trackingNumber ? `<p>Tracking number: <strong>${escapeHtml(trackingNumber)}</strong></p>` : ''}
		${emailButtonHtml(orderUrl, 'View Your Order')}
	`);

	const text = `Hi ${name},\n\nGood news -- your order is on its way!\n${trackingNumber ? `\nTracking number: ${trackingNumber}\n` : ''}\nView your order: ${orderUrl}`;

	return { subject, html, text };
};
