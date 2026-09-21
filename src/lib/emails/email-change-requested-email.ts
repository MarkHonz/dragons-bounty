import {
	wrapEmailHtml,
	emailButtonHtml,
	emailColors,
	escapeHtml,
} from './shared';

type EmailChangeRequestedEmailProps = {
	name: string;
	// the address it would change to, already masked (j***@example.com)
	maskedNewEmail: string;
	forgotPasswordUrl: string;
};

// Goes to the CURRENT address when a change is asked for, so the owner hears
// about it even if someone else asked.
export const buildEmailChangeRequestedEmail = ({
	name,
	maskedNewEmail,
	forgotPasswordUrl,
}: EmailChangeRequestedEmailProps) => {
	const subject =
		"A change of email was requested for your Dragon's Bounty account";
	const detail = `Someone asked to change the email address on your Dragon's Bounty account to ${maskedNewEmail}. Nothing has changed yet: it only happens if that address is confirmed.`;
	const advice =
		"If that was you, there's nothing to do here. If it wasn't, choose a new password right away.";

	const html = wrapEmailHtml(`
		<p>Hi ${escapeHtml(name)},</p>
		<p>${escapeHtml(detail)}</p>
		<p>${advice}</p>
		${emailButtonHtml(forgotPasswordUrl, 'Reset My Password')}
		<p style="color:${emailColors.mutedText}; font-size: 13px;">You're receiving this because it's a security notice for your account.</p>
	`);

	const text = `Hi ${name},\n\n${detail}\n\n${advice}\n\nReset your password: ${forgotPasswordUrl}`;

	return { subject, html, text };
};
