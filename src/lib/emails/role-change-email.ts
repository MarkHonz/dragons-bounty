import { wrapEmailHtml, emailButtonHtml, emailColors, escapeHtml } from './shared';

type RoleChangeEmailProps = {
	name: string;
	// true when they were made an admin, false when admin access was removed
	promoted: boolean;
	// who made the change
	changedBy: string;
	adminUrl: string;
};

export const buildRoleChangeEmail = ({
	name,
	promoted,
	changedBy,
	adminUrl,
}: RoleChangeEmailProps) => {
	const subject = promoted
		? "You now have admin access to Dragon's Bounty"
		: "Your admin access to Dragon's Bounty was removed";

	const what = promoted
		? 'given you admin access to'
		: 'removed your admin access to';
	const detail = promoted
		? 'You can now manage products, categories, customers and orders.'
		: "You can still sign in and shop as a customer, but you can't open the admin area any more.";
	const contact =
		"If you weren't expecting this, please contact the person who runs the shop.";

	const html = wrapEmailHtml(`
		<p>Hi ${escapeHtml(name)},</p>
		<p>${escapeHtml(changedBy)} has ${what} the Dragon's Bounty shop.</p>
		<p>${detail}</p>
		${promoted ? emailButtonHtml(adminUrl, 'Open the Admin Area') : ''}
		<p style="color:${emailColors.mutedText}; font-size: 13px;">${contact}</p>
	`);

	const text = `Hi ${name},\n\n${changedBy} has ${what} the Dragon's Bounty shop.\n\n${detail}\n${promoted ? `\nOpen the admin area: ${adminUrl}\n` : ''}\n${contact}`;

	return { subject, html, text };
};
