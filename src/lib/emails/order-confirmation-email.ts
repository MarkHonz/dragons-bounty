import {
	wrapEmailHtml,
	emailButtonHtml,
	emailColors,
	escapeHtml,
} from './shared';
import { formatCurrency } from '@/lib/formatters';

type OrderLineItem = {
	name: string;
	quantity: number;
	priceInCents: number;
};

export type ShippingAddress = {
	name: string | null;
	address1: string | null;
	address2: string | null;
	city: string | null;
	state: string | null;
	zip: string | null;
};

type OrderConfirmationEmailProps = {
	name: string;
	orderId: string;
	lineItems: OrderLineItem[];
	productTotalInCents: number;
	shippingTotalInCents: number | null;
	taxTotalInCents: number | null;
	// the discount code used on the order, if any
	discountInCents?: number | null;
	discountCode?: string | null;
	totalInCents: number;
	orderUrl: string;
	// the address saved with the order; nothing is shown when there isn't one
	shippingAddress?: ShippingAddress | null;
};

// the address as separate lines, skipping empty parts
const addressLines = (address: ShippingAddress) =>
	[
		address.name,
		address.address1,
		address.address2,
		[address.city, address.state].filter(Boolean).join(', ') +
			(address.zip ? ` ${address.zip}` : ''),
	].filter((line): line is string => Boolean(line && line.trim()));

export const buildOrderConfirmationEmail = ({
	name,
	orderId,
	lineItems,
	productTotalInCents,
	shippingTotalInCents,
	taxTotalInCents,
	discountInCents,
	discountCode,
	totalInCents,
	orderUrl,
	shippingAddress,
}: OrderConfirmationEmailProps) => {
	const subject = `Order confirmed — #${orderId.slice(-8)}`;

	const lineItemsHtml = lineItems
		.map(
			(item) => `
		<tr>
			<td style="padding: 6px 0; border-bottom: 1px solid ${emailColors.border};">${escapeHtml(item.name)} &times; ${item.quantity}</td>
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

	// what the code did: an amount off, or (when it only made shipping free) a note
	const discountLabel = discountCode ? `Discount (${discountCode})` : '';
	const discountValue =
		discountInCents && discountInCents > 0
			? `-${formatCurrency(discountInCents / 100)}`
			: 'Free shipping';

	const shipToLines = shippingAddress?.address1 ? addressLines(shippingAddress) : [];
	const shipToHtml = shipToLines.length
		? `<p style="margin: 16px 0 0 0;"><strong>Shipping to</strong><br>${shipToLines
				.map(escapeHtml)
				.join('<br>')}</p>`
		: '';
	const shipToText = shipToLines.length
		? `\n\nShipping to:\n${shipToLines.join('\n')}`
		: '';

	const html = wrapEmailHtml(`
		<p>Hi ${escapeHtml(name)},</p>
		<p>Thanks for your order! Here's your receipt:</p>
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
			${lineItemsHtml}
			<tr>
				<td style="padding-top: 10px;">Subtotal</td>
				<td style="padding-top: 10px; text-align:right;">${formatCurrency(productTotalInCents / 100)}</td>
			</tr>
			${
				discountCode
					? `<tr><td>${escapeHtml(discountLabel)}</td><td style="text-align:right;">${escapeHtml(discountValue)}</td></tr>`
					: ''
			}
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
		${shipToHtml}
		${emailButtonHtml(orderUrl, 'View Your Order')}
	`);

	const text = `Hi ${name},\n\nThanks for your order! Here's your receipt:\n\n${lineItemsText}\n\nSubtotal: ${formatCurrency(productTotalInCents / 100)}${discountCode ? `\n${discountLabel}: ${discountValue}` : ''}${shippingTotalInCents ? `\nShipping: ${formatCurrency(shippingTotalInCents / 100)}` : ''}${taxTotalInCents ? `\nTax: ${formatCurrency(taxTotalInCents / 100)}` : ''}\nTotal: ${formatCurrency(totalInCents / 100)}${shipToText}\n\nView your order: ${orderUrl}`;

	return { subject, html, text };
};
