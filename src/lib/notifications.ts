import { sendEmail } from '@/lib/email';
import { buildVerificationEmail } from '@/lib/emails/verification-email';
import {
	buildOrderConfirmationEmail,
	ShippingAddress,
} from '@/lib/emails/order-confirmation-email';
import { buildShippingUpdateEmail } from '@/lib/emails/shipping-update-email';
import { buildRefundEmail } from '@/lib/emails/refund-email';
import { buildRoleChangeEmail } from '@/lib/emails/role-change-email';
import { buildAdminAddedNoticeEmail } from '@/lib/emails/admin-added-notice-email';
import { buildPasswordResetEmail } from '@/lib/emails/password-reset-email';
import { buildPasswordChangedEmail } from '@/lib/emails/password-changed-email';
import { buildSignInBlockedEmail } from '@/lib/emails/sign-in-blocked-email';

type SendVerificationEmailProps = {
	name: string;
	email: string;
	verifyUrl: string;
};

export const sendVerificationEmail = async ({
	name,
	email,
	verifyUrl,
}: SendVerificationEmailProps) => {
	const { subject, html, text } = buildVerificationEmail({ name, verifyUrl });
	return sendEmail({ to: email, subject, html, text });
};

type SendOrderConfirmationEmailProps = {
	name: string;
	email: string;
	orderId: string;
	lineItems: { name: string; quantity: number; priceInCents: number }[];
	productTotalInCents: number;
	shippingTotalInCents: number | null;
	taxTotalInCents: number | null;
	discountInCents?: number | null;
	discountCode?: string | null;
	totalInCents: number;
	orderUrl: string;
	shippingAddress?: ShippingAddress | null;
};

export const sendOrderConfirmationEmail = async ({
	name,
	email,
	orderId,
	lineItems,
	productTotalInCents,
	shippingTotalInCents,
	taxTotalInCents,
	discountInCents,
	discountCode,
	totalInCents,
	orderUrl,
	shippingAddress,
}: SendOrderConfirmationEmailProps) => {
	const { subject, html, text } = buildOrderConfirmationEmail({
		name,
		orderId,
		lineItems,
		productTotalInCents,
		shippingTotalInCents,
		taxTotalInCents,
		discountInCents,
		discountCode,
		totalInCents,
		orderUrl,
		shippingAddress,
	});
	return sendEmail({ to: email, subject, html, text });
};

type SendShippingUpdateEmailProps = {
	name: string;
	email: string;
	orderId: string;
	trackingNumber: string | null;
	orderUrl: string;
};

export const sendShippingUpdateEmail = async ({
	name,
	email,
	orderId,
	trackingNumber,
	orderUrl,
}: SendShippingUpdateEmailProps) => {
	const { subject, html, text } = buildShippingUpdateEmail({
		name,
		orderId,
		trackingNumber,
		orderUrl,
	});
	return sendEmail({ to: email, subject, html, text });
};

type SendRefundEmailProps = {
	name: string;
	email: string;
	orderId: string;
	refundedAmountInCents: number;
	orderUrl: string;
};

export const sendRefundEmail = async ({
	name,
	email,
	orderId,
	refundedAmountInCents,
	orderUrl,
}: SendRefundEmailProps) => {
	const { subject, html, text } = buildRefundEmail({
		name,
		orderId,
		refundedAmountInCents,
		orderUrl,
	});
	return sendEmail({ to: email, subject, html, text });
};

type SendRoleChangeEmailProps = {
	name: string;
	email: string;
	promoted: boolean;
	changedBy: string;
	adminUrl: string;
};

export const sendRoleChangeEmail = async ({
	name,
	email,
	promoted,
	changedBy,
	adminUrl,
}: SendRoleChangeEmailProps) => {
	const { subject, html, text } = buildRoleChangeEmail({
		name,
		promoted,
		changedBy,
		adminUrl,
	});
	return sendEmail({ to: email, subject, html, text });
};

type SendAdminAddedNoticeEmailProps = {
	name: string;
	email: string;
	newAdmin: string;
	changedBy: string;
	roleHistoryUrl: string;
};

export const sendAdminAddedNoticeEmail = async ({
	name,
	email,
	newAdmin,
	changedBy,
	roleHistoryUrl,
}: SendAdminAddedNoticeEmailProps) => {
	const { subject, html, text } = buildAdminAddedNoticeEmail({
		name,
		newAdmin,
		changedBy,
		roleHistoryUrl,
	});
	return sendEmail({ to: email, subject, html, text });
};

export const sendPasswordResetEmail = async ({
	name,
	email,
	resetUrl,
}: {
	name: string;
	email: string;
	resetUrl: string;
}) => {
	const { subject, html, text } = buildPasswordResetEmail({ name, resetUrl });
	return sendEmail({ to: email, subject, html, text });
};

export const sendPasswordChangedEmail = async ({
	name,
	email,
	forgotPasswordUrl,
}: {
	name: string;
	email: string;
	forgotPasswordUrl: string;
}) => {
	const { subject, html, text } = buildPasswordChangedEmail({
		name,
		forgotPasswordUrl,
	});
	return sendEmail({ to: email, subject, html, text });
};

export const sendSignInBlockedEmail = async ({
	name,
	email,
	forgotPasswordUrl,
}: {
	name: string;
	email: string;
	forgotPasswordUrl: string;
}) => {
	const { subject, html, text } = buildSignInBlockedEmail({
		name,
		forgotPasswordUrl,
	});
	return sendEmail({ to: email, subject, html, text });
};
