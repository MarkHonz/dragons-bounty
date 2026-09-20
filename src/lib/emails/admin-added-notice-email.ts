import {
	wrapEmailHtml,
	emailButtonHtml,
	emailColors,
	escapeHtml,
} from './shared';

type AdminAddedNoticeEmailProps = {
	// the admin being told
	name: string;
	// who was made an admin, and by whom (a name, or an email when there is no name)
	newAdmin: string;
	changedBy: string;
	roleHistoryUrl: string;
};

// A heads-up to the other admins that someone was given admin access, so nobody
// gets in without the rest of the team being able to see it. The subject is the
// same every time: names are typed by customers and can hold anything.
export const buildAdminAddedNoticeEmail = ({
	name,
	newAdmin,
	changedBy,
	roleHistoryUrl,
}: AdminAddedNoticeEmailProps) => {
	const subject = "A new admin was added to Dragon's Bounty";
	const detail = `${changedBy} gave ${newAdmin} admin access to the Dragon's Bounty shop.`;
	const contact =
		"If you weren't expecting this, check the role history and talk to the person who made the change.";

	const html = wrapEmailHtml(`
		<p>Hi ${escapeHtml(name)},</p>
		<p>${escapeHtml(detail)}</p>
		${emailButtonHtml(roleHistoryUrl, 'View Role History')}
		<p style="color:${emailColors.mutedText}; font-size: 13px;">${contact}</p>
	`);

	const text = `Hi ${name},\n\n${detail}\n\nView the role history: ${roleHistoryUrl}\n\n${contact}`;

	return { subject, html, text };
};
