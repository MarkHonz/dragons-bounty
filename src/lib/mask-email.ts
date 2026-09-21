// An email address with most of the name hidden, for telling someone about an
// address without spelling it out in full: "jane.doe@example.com" -> "j***@example.com".
export const maskEmail = (email: string) => {
	const at = email.lastIndexOf('@');
	if (at <= 0) return '***';
	return `${email.slice(0, 1)}***${email.slice(at)}`;
};
