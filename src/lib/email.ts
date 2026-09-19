import { Resend } from 'resend';

type SendEmailProps = {
	to: string;
	subject: string;
	html: string;
	text: string;
};

export const sendEmail = async ({ to, subject, html, text }: SendEmailProps) => {
	if (!process.env.RESEND_API_KEY) {
		console.log(
			`[email:dev] to=${to} subject="${subject}"\n${text}`
		);
		return { success: true };
	}

	try {
		const resend = new Resend(process.env.RESEND_API_KEY);
		await resend.emails.send({
			from: process.env.EMAIL_FROM as string,
			to,
			subject,
			html,
			text,
		});
		return { success: true };
	} catch (error) {
		console.error('Failed to send email', error);
		return { success: false, error };
	}
};
