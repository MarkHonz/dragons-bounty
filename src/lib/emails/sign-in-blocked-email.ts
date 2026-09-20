import {
	wrapEmailHtml,
	emailButtonHtml,
	emailColors,
	escapeHtml,
} from './shared';

type SignInBlockedEmailProps = {
	name: string;
	forgotPasswordUrl: string;
};

// Sent to an account's owner when the wrong password has been entered for it
// several times, so they hear about a guessing attempt (or can tell they've just
// mistyped their own).
export const buildSignInBlockedEmail = ({
	name,
	forgotPasswordUrl,
}: SignInBlockedEmailProps) => {
	const subject = "Sign-in to your Dragon's Bounty account is paused";
	const detail =
		"Someone entered the wrong password for your Dragon's Bounty account several times, so sign-in for it is paused for about 15 minutes.";
	const advice =
		"If that was you, just wait a little while, or reset your password now. If it wasn't, consider choosing a new password, and contact the person who runs the shop if you're worried.";

	const html = wrapEmailHtml(`
		<p>Hi ${escapeHtml(name)},</p>
		<p>${escapeHtml(detail)}</p>
		<p>${escapeHtml(advice)}</p>
		${emailButtonHtml(forgotPasswordUrl, 'Reset My Password')}
		<p style="color:${emailColors.mutedText}; font-size: 13px;">Your password has not been changed, and nobody has been let in.</p>
	`);

	const text = `Hi ${name},\n\n${detail}\n\n${advice}\n\nReset your password: ${forgotPasswordUrl}\n\nYour password has not been changed, and nobody has been let in.`;

	return { subject, html, text };
};
