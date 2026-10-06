import { wrapEmailHtml, emailButtonHtml, emailColors, escapeHtml } from './shared';
import { budgetLabel, formatNeededBy } from '@/lib/custom-request-rules';

type CustomRequestEmailProps = {
	adminName: string;
	request: {
		name: string;
		email: string | null;
		phone: string | null;
		preferredContact: string | null;
		description: string;
		budget: string | null;
		neededBy: string | null;
	};
	requestUrl: string;
};

// Tells an admin someone has asked for custom art. Everything the visitor typed
// is escaped; the description keeps its line breaks.
export const buildCustomRequestEmail = ({
	adminName,
	request,
	requestUrl,
}: CustomRequestEmailProps) => {
	const subject = `New custom art request from ${request.name}`;
	const preferred =
		request.preferredContact === 'PHONE'
			? 'Phone'
			: request.preferredContact === 'EMAIL'
				? 'Email'
				: null;
	const rows: [string, string | null][] = [
		['Name', request.name],
		['Email', request.email],
		['Phone', request.phone],
		['Prefers', preferred],
		['Budget', budgetLabel(request.budget)],
		['Needed by', formatNeededBy(request.neededBy)],
	];
	const shown = rows.filter((row): row is [string, string] => Boolean(row[1]));

	const html = wrapEmailHtml(`
		<p>Hi ${escapeHtml(adminName)},</p>
		<p>Someone has asked about custom art:</p>
		<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 16px 0;">
			${shown
				.map(
					([label, value]) =>
						`<tr><td style="padding: 2px 12px 2px 0; color:${emailColors.mutedText};">${label}</td><td style="padding: 2px 0;"><strong>${escapeHtml(value)}</strong></td></tr>`
				)
				.join('')}
		</table>
		<p style="margin-bottom: 4px; color:${emailColors.mutedText};">What they're looking for:</p>
		<p style="white-space: pre-wrap; margin-top: 0;">${escapeHtml(request.description)}</p>
		${emailButtonHtml(requestUrl, 'Open the Request')}
		<p style="color:${emailColors.mutedText}; font-size: 13px;">${
			request.email
				? 'Replying to this email goes straight to them.'
				: 'They left a phone number only, so please call or text them.'
		}</p>
	`);

	const text = `Hi ${adminName},\n\nSomeone has asked about custom art:\n\n${shown
		.map(([label, value]) => `${label}: ${value}`)
		.join('\n')}\n\nWhat they're looking for:\n${request.description}\n\nOpen the request: ${requestUrl}\n\n${
		request.email
			? 'Replying to this email goes straight to them.'
			: 'They left a phone number only, so please call or text them.'
	}`;

	return { subject, html, text };
};
