import { wrapEmailHtml, emailButtonHtml, emailColors, escapeHtml } from './shared';

type ArtistNewOrderEmailProps = {
	artistName: string;
	orderId: string;
	// only this artist's items
	items: { name: string; quantity: number }[];
	shipTo: {
		name: string | null;
		address1: string | null;
		address2: string | null;
		city: string | null;
		state: string | null;
		zip: string | null;
	};
	artistPageUrl: string;
};

// Tells an artist an order includes their items and where to send them. Only the
// buyer's name and shipping address are included, never their email.
export const buildArtistNewOrderEmail = ({
	artistName,
	orderId,
	items,
	shipTo,
	artistPageUrl,
}: ArtistNewOrderEmailProps) => {
	const number = `#${orderId.slice(-8)}`;
	const subject = `New order to ship — ${number}`;
	const addressLines = [
		shipTo.name,
		shipTo.address1,
		shipTo.address2,
		[shipTo.city, [shipTo.state, shipTo.zip].filter(Boolean).join(' ')]
			.filter(Boolean)
			.join(', '),
	].filter((line): line is string => Boolean(line));

	const html = wrapEmailHtml(`
		<p>Hi ${escapeHtml(artistName)},</p>
		<p>Order <strong>${number}</strong> includes your work. Please ship these items:</p>
		<ul>
			${items.map((item) => `<li>${item.quantity} &times; ${escapeHtml(item.name)}</li>`).join('')}
		</ul>
		<p><strong>Ship to:</strong><br>${addressLines.map(escapeHtml).join('<br>') || 'No address on the order &mdash; please contact the shop.'}</p>
		<p>When it's on its way, enter the tracking number on your artist page.</p>
		${emailButtonHtml(artistPageUrl, 'Open Your Artist Page')}
		<p style="color:${emailColors.mutedText}; font-size: 13px;">Questions about this order? Contact the shop rather than the customer.</p>
	`);

	const text = `Hi ${artistName},\n\nOrder ${number} includes your work. Please ship these items:\n${items
		.map((item) => `- ${item.quantity} x ${item.name}`)
		.join('\n')}\n\nShip to:\n${addressLines.join('\n') || 'No address on the order - please contact the shop.'}\n\nWhen it's on its way, enter the tracking number on your artist page:\n${artistPageUrl}\n\nQuestions about this order? Contact the shop rather than the customer.`;

	return { subject, html, text };
};
