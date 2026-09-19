import { wrapEmailHtml, emailButtonHtml } from './shared';

type VerificationEmailProps = {
	name: string;
	verifyUrl: string;
};

export const buildVerificationEmail = ({
	name,
	verifyUrl,
}: VerificationEmailProps) => {
	const subject = 'Verify your email for Dragon’s Bounty';

	const html = wrapEmailHtml(`
		<p>Hi ${name},</p>
		<p>Thanks for creating an account with Dragon's Bounty. Please confirm this is your email address:</p>
		${emailButtonHtml(verifyUrl, 'Verify Email Address')}
		<p>This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>
	`);

	const text = `Hi ${name},\n\nThanks for creating an account with Dragon's Bounty. Please confirm this is your email address by visiting the link below:\n\n${verifyUrl}\n\nThis link expires in 24 hours. If you didn't create this account, you can ignore this email.`;

	return { subject, html, text };
};
