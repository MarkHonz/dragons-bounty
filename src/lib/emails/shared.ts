export const emailColors = {
	background: '#FBF6EC',
	card: '#FFFFFF',
	border: '#E8DFCF',
	text: '#3A2A20',
	mutedText: '#8A7A6D',
	primary: '#B8712E',
	primaryText: '#FFFFFF',
};

// Anything a customer or admin typed (names, product names, addresses, tracking
// numbers) must go through this before it is placed inside email HTML.
export const escapeHtml = (value: string) =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

export const wrapEmailHtml = (bodyHtml: string) => `
<!DOCTYPE html>
<html>
	<body style="margin:0; padding:0; background-color:${emailColors.background}; font-family: Georgia, 'Times New Roman', serif; color:${emailColors.text};">
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 32px 16px;">
			<tr>
				<td align="center">
					<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color:${emailColors.card}; border:1px solid ${emailColors.border}; border-radius: 16px; overflow: hidden;">
						<tr>
							<td style="padding: 24px 32px 8px 32px; text-align:center; font-size: 20px; font-weight: bold;">
								Dragon's Bounty
							</td>
						</tr>
						<tr>
							<td style="padding: 16px 32px 32px 32px; font-size: 15px; line-height: 1.6;">
								${bodyHtml}
							</td>
						</tr>
						<tr>
							<td style="padding: 16px 32px; border-top: 1px solid ${emailColors.border}; text-align:center; font-size: 12px; color:${emailColors.mutedText};">
								Dragon's Bounty &mdash; Adventuring supplies, potions, and curiosities.
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</body>
</html>
`;

export const emailButtonHtml = (href: string, label: string) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
	<tr>
		<td style="border-radius: 999px; background-color:${emailColors.primary};">
			<a href="${escapeHtml(href)}" style="display:inline-block; padding: 12px 28px; color:${emailColors.primaryText}; text-decoration:none; font-weight:bold; font-size: 14px;">
				${label}
			</a>
		</td>
	</tr>
</table>
`;
