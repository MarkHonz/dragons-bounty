import { sendEmail } from '@/lib/email';
import { buildVerificationEmail } from '@/lib/emails/verification-email';
import { buildOrderConfirmationEmail } from '@/lib/emails/order-confirmation-email';
import { buildShippingUpdateEmail } from '@/lib/emails/shipping-update-email';
import { buildRefundEmail } from '@/lib/emails/refund-email';

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
	totalInCents: number;
	orderUrl: string;
};

export const sendOrderConfirmationEmail = async ({
	name,
	email,
	orderId,
	lineItems,
	productTotalInCents,
	shippingTotalInCents,
	taxTotalInCents,
	totalInCents,
	orderUrl,
}: SendOrderConfirmationEmailProps) => {
	const { subject, html, text } = buildOrderConfirmationEmail({
		name,
		orderId,
		lineItems,
		productTotalInCents,
		shippingTotalInCents,
		taxTotalInCents,
		totalInCents,
		orderUrl,
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
