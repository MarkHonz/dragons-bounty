import {
	wrapEmailHtml,
	emailButtonHtml,
	emailColors,
	escapeHtml,
} from './shared';

type EmailChangedEmailProps = {
	name: string;
	// the new address, already masked (j***@example.com)
	maskedNewEmail: string;
	forgotPasswordUrl: string;
};

// Goes to the OLD address once the change has been made.
export const buildEmailChangedEmail = ({
	name,
	maskedNewEmail,
	forgotPasswordUrl,
}: EmailChangedEmailProps) => {
	const subject =
		"The email address on your Dragon's Bounty account was changed";
	const detail = `The email address on your Dragon's Bounty account was just changed to ${maskedNewEmail}. From now on you sign in with the new address, and this one no longer receives email about the account. Any other devices that were signed in have been signed out.`;
	const warning =
		"If this was you, there's nothing more to do. If it wasn't, contact the person who runs the shop right away.";

	const html = wrapEmailHtml(`
		<p>Hi ${escapeHtml(name)},</p>
		<p>${escapeHtml(detail)}</p>
		<p>${warning}</p>
		${emailButtonHtml(forgotPasswordUrl, 'Reset My Password')}
		<p style="color:${emailColors.mutedText}; font-size: 13px;">You're receiving this because it's a security notice for your account.</p>
	`);

	const text = `Hi ${name},\n\n${detail}\n\n${warning}\n\nReset your password: ${forgotPasswordUrl}`;

	return { subject, html, text };
};
