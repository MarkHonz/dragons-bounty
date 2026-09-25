import { wrapEmailHtml, emailButtonHtml, emailColors, escapeHtml } from './shared';

type ArtistStatusEmailProps = {
	name: string;
	// true when they were made an artist, false when that was removed
	added: boolean;
	artistName: string;
	artistPageUrl: string;
};

export const buildArtistStatusEmail = ({
	name,
	added,
	artistName,
	artistPageUrl,
}: ArtistStatusEmailProps) => {
	const subject = added
		? "You're now an artist on Dragon's Bounty"
		: "Your artist access on Dragon's Bounty has ended";
	const detail = added
		? `Your work will be shown as made by <strong>${escapeHtml(artistName)}</strong>. Your artist page lists your products and the orders you need to ship, and it's where you enter tracking numbers.`
		: "You can still sign in and shop as a customer. The shop will look after any of your orders that haven't shipped yet.";
	const detailText = added
		? `Your work will be shown as made by ${artistName}. Your artist page lists your products and the orders you need to ship, and it's where you enter tracking numbers.`
		: "You can still sign in and shop as a customer. The shop will look after any of your orders that haven't shipped yet.";
	const contact = 'To add or change a product, send the details and photos to the shop.';

	const html = wrapEmailHtml(`
		<p>Hi ${escapeHtml(name)},</p>
		<p>${detail}</p>
		${added ? emailButtonHtml(artistPageUrl, 'Open Your Artist Page') : ''}
		${added ? `<p style="color:${emailColors.mutedText}; font-size: 13px;">${contact}</p>` : ''}
	`);
	const text = `Hi ${name},\n\n${detailText}\n${added ? `\nOpen your artist page: ${artistPageUrl}\n\n${contact}\n` : ''}`;

	return { subject, html, text };
};
