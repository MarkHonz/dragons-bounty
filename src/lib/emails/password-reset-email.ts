import {
	wrapEmailHtml,
	emailButtonHtml,
	emailColors,
	escapeHtml,
} from './shared';

type PasswordResetEmailProps = {
	name: string;
	resetUrl: string;
};

export const buildPasswordResetEmail = ({
	name,
	resetUrl,
}: PasswordResetEmailProps) => {
	const subject = "Reset your Dragon's Bounty password";
	const ignore =
		"If you didn't ask for this, you can ignore this email. Your password won't change.";

	const html = wrapEmailHtml(`
		<p>Hi ${escapeHtml(name)},</p>
		<p>Someone asked to reset the password for your Dragon's Bounty account. To choose a new one, use the button below:</p>
		${emailButtonHtml(resetUrl, 'Choose a New Password')}
		<p>This link works once and expires in 1 hour.</p>
		<p style="color:${emailColors.mutedText}; font-size: 13px;">${ignore}</p>
	`);

	const text = `Hi ${name},\n\nSomeone asked to reset the password for your Dragon's Bounty account. To choose a new one, visit the link below:\n\n${resetUrl}\n\nThis link works once and expires in 1 hour.\n\n${ignore}`;

	return { subject, html, text };
};
