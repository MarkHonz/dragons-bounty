import { wrapEmailHtml, emailButtonHtml, escapeHtml } from './shared';

type ShippingUpdateEmailProps = {
	name: string;
	orderId: string;
	trackingNumber: string | null;
	orderUrl: string;
	// the items in this package, and who sent it (null = the shop). An order
	// from several sellers ships as several packages, each with its own email.
	items?: { name: string; quantity: number }[];
	sellerName?: string | null;
	// true when other packages from the same order are still to come
	moreToCome?: boolean;
};

export const buildShippingUpdateEmail = ({
	name,
	orderId,
	trackingNumber,
	orderUrl,
	items = [],
	sellerName = null,
	moreToCome = false,
}: ShippingUpdateEmailProps) => {
	const number = `#${orderId.slice(-8)}`;
	const subject = moreToCome
		? `Part of your order has shipped — ${number}`
		: `Your order has shipped — ${number}`;
	const from = sellerName ? ` from ${sellerName}` : '';
	const lead = moreToCome
		? `Good news &mdash; a package${escapeHtml(from)} is on its way! The rest of your order will follow separately.`
		: `Good news &mdash; your ${sellerName ? `package${escapeHtml(from)}` : 'order'} is on its way!`;
	const leadText = moreToCome
		? `Good news -- a package${from} is on its way! The rest of your order will follow separately.`
		: `Good news -- your ${sellerName ? `package${from}` : 'order'} is on its way!`;

	const html = wrapEmailHtml(`
		<p>Hi ${escapeHtml(name)},</p>
		<p>${lead}</p>
		${items.length ? `<ul>${items.map((item) => `<li>${item.quantity} &times; ${escapeHtml(item.name)}</li>`).join('')}</ul>` : ''}
		${trackingNumber ? `<p>Tracking number: <strong>${escapeHtml(trackingNumber)}</strong></p>` : ''}
		${emailButtonHtml(orderUrl, 'View Your Order')}
	`);

	const text = `Hi ${name},\n\n${leadText}\n${items.length ? `\n${items.map((item) => `- ${item.quantity} x ${item.name}`).join('\n')}\n` : ''}${trackingNumber ? `\nTracking number: ${trackingNumber}\n` : ''}\nView your order: ${orderUrl}`;

	return { subject, html, text };
};
