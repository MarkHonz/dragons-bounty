import { wrapEmailHtml, emailButtonHtml, emailColors } from './shared';
import { formatCurrency } from '@/lib/formatters';

type OrderLineItem = {
	name: string;
	quantity: number;
	priceInCents: number;
};

type OrderConfirmationEmailProps = {
	name: string;
	orderId: string;
	lineItems: OrderLineItem[];
	productTotalInCents: number;
	shippingTotalInCents: number | null;
	taxTotalInCents: number | null;
	totalInCents: number;
	orderUrl: string;
};

export const buildOrderConfirmationEmail = ({
	name,
	orderId,
	lineItems,
	productTotalInCents,
	shippingTotalInCents,
	taxTotalInCents,
	totalInCents,
	orderUrl,
}: OrderConfirmationEmailProps) => {
	const subject = `Order confirmed — #${orderId.slice(-8)}`;

	const lineItemsHtml = lineItems
		.map(
			(item) => `
		<tr>
			<td style="padding: 6px 0; border-bottom: 1px solid ${emailColors.border};">${item.name} &times; ${item.quantity}</td>
			<td style="padding: 6px 0; border-bottom: 1px solid ${emailColors.border}; text-align:right;">${formatCurrency((item.priceInCents * item.quantity) / 100)}</td>
		</tr>`
		)
		.join('');

	const lineItemsText = lineItems
		.map(
			(item) =>
				`  ${item.name} x${item.quantity} - ${formatCurrency((item.priceInCents * item.quantity) / 100)}`
		)
		.join('\n');

	const html = wrapEmailHtml(`
		<p>Hi ${name},</p>
		<p>Thanks for your order! Here's your receipt:</p>
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
			${lineItemsHtml}
			<tr>
				<td style="padding-top: 10px;">Subtotal</td>
				<td style="padding-top: 10px; text-align:right;">${formatCurrency(productTotalInCents / 100)}</td>
			</tr>
			${
				shippingTotalInCents
					? `<tr><td>Shipping</td><td style="text-align:right;">${formatCurrency(shippingTotalInCents / 100)}</td></tr>`
					: ''
			}
			${
				taxTotalInCents
					? `<tr><td>Tax</td><td style="text-align:right;">${formatCurrency(taxTotalInCents / 100)}</td></tr>`
					: ''
			}
			<tr>
				<td style="padding-top: 6px; font-weight:bold;">Total</td>
				<td style="padding-top: 6px; text-align:right; font-weight:bold;">${formatCurrency(totalInCents / 100)}</td>
			</tr>
		</table>
		${emailButtonHtml(orderUrl, 'View Your Order')}
	`);

	const text = `Hi ${name},\n\nThanks for your order! Here's your receipt:\n\n${lineItemsText}\n\nSubtotal: ${formatCurrency(productTotalInCents / 100)}${shippingTotalInCents ? `\nShipping: ${formatCurrency(shippingTotalInCents / 100)}` : ''}${taxTotalInCents ? `\nTax: ${formatCurrency(taxTotalInCents / 100)}` : ''}\nTotal: ${formatCurrency(totalInCents / 100)}\n\nView your order: ${orderUrl}`;

	return { subject, html, text };
};
