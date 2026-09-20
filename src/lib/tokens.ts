import crypto from 'node:crypto';

export function generateVerificationToken() {
	return crypto.randomBytes(32).toString('hex');
}

// A reset token is only ever stored as this hash. The token itself exists in the
// email that was sent, so a copy of the database can't be used to reset anyone's
// password.
export function hashToken(token: string) {
	return crypto.createHash('sha256').update(token).digest('hex');
}
