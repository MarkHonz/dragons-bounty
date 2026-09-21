import {
	wrapEmailHtml,
	emailButtonHtml,
	emailColors,
	escapeHtml,
} from './shared';

type EmailChangeConfirmEmailProps = {
	name: string;
	confirmUrl: string;
};

// Goes to the NEW address, so that only someone who can read that mailbox can
// finish the change.
export const buildEmailChangeConfirmEmail = ({
	name,
	confirmUrl,
}: EmailChangeConfirmEmailProps) => {
	const subject = "Confirm your new email address for Dragon's Bounty";
	const ignore =
		"If you didn't ask for this, you can ignore this email. Nothing will change.";

	const html = wrapEmailHtml(`
		<p>Hi ${escapeHtml(name)},</p>
		<p>You asked to use this email address for your Dragon's Bounty account. To confirm the change, use the button below (you'll need to be signed in to your account):</p>
		${emailButtonHtml(confirmUrl, 'Confirm New Email')}
		<p>This link works once and expires in 24 hours.</p>
		<p style="color:${emailColors.mutedText}; font-size: 13px;">${ignore}</p>
	`);

	const text = `Hi ${name},\n\nYou asked to use this email address for your Dragon's Bounty account. To confirm the change, visit the link below (you'll need to be signed in to your account):\n\n${confirmUrl}\n\nThis link works once and expires in 24 hours.\n\n${ignore}`;

	return { subject, html, text };
};
