import {
	wrapEmailHtml,
	emailButtonHtml,
	emailColors,
	escapeHtml,
} from './shared';

type PasswordChangedEmailProps = {
	name: string;
	// where to ask for a new password if this wasn't them
	forgotPasswordUrl: string;
};

// A security notice: it goes out after every password change or reset, so the
// account's owner hears about it even if someone else did it.
export const buildPasswordChangedEmail = ({
	name,
	forgotPasswordUrl,
}: PasswordChangedEmailProps) => {
	const subject = "Your Dragon's Bounty password was changed";
	const detail =
		"The password for your Dragon's Bounty account was just changed, and any other devices that were signed in have been signed out.";
	const warning =
		"If this was you, there's nothing more to do. If it wasn't, choose a new password right away and contact the person who runs the shop.";

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
