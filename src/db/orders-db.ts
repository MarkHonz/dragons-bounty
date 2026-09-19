import db from '@/db/db';

export type OrderProps = {
	id: string;
	productTotalInCents: number;
	taxTotalInCents: number;
	shippingTotalInCents: number;
	totalInCents: number;
	profileId: string;
	createdAt: Date;
	fulfilled?: boolean;
	trackingNumber?: string;
	stripePaymentIntentId?: string | null;
	refundedAt?: Date | null;
	refundedAmountInCents?: number | null;
	stripeRefundId?: string | null;
};

export type OrderProductProps = {
	order_id: string;
	product_id: string;
	quantity: number;
	priceInCents: number;
};

type CreateOrderProps = {
	productTotalInCents: number;
	taxTotalInCents: number;
	shippingTotalInCents: number;
	totalInCents: number;
	profileId: string;
	stripePaymentIntentId?: string;
};

// create an order for a user profile
export const createOrder = async ({
	productTotalInCents,
	taxTotalInCents,
	shippingTotalInCents,
	totalInCents,
	profileId,
	stripePaymentIntentId,
}: CreateOrderProps) => {
	try {
		return await db.order.create({
			data: {
				productTotalInCents,
				taxTotalInCents,
				shippingTotalInCents,
				totalInCents,
				stripePaymentIntentId,
				// fulfilled: false,
				profile: {
					connect: {
						id: profileId,
					},
				},
			},
			include: {
				Order_Products: true,
			},
		});
	} catch (error) {
		return error;
	}
};

// get an order by its Stripe payment intent id (used for webhook idempotency
// and the purchase-success confirmation lookup)
export const getOrderByPaymentIntentId = async (
	stripePaymentIntentId: string
) => {
	try {
		return await db.order.findUnique({
			where: {
				stripePaymentIntentId,
			},
		});
	} catch (error) {
		return error;
	}
};

// get orders by user profile id
export const getOrdersByProfileId = async (profileId: string) => {
	try {
		return await db.order.findMany({
			where: {
				profileId,
			},
		});
	} catch (error) {
		return error;
	}
};

// get order details by order id
export const getOrderDetails = async (orderId: string) => {
	try {
		return await db.order.findUnique({
			where: {
				id: orderId,
			},
		});
	} catch (error) {
		return error;
	}
};

// get all orders
export const getOrders = async () => {
	try {
		return await db.order.findMany({ orderBy: { createdAt: 'desc' } });
	} catch (error) {
		return error;
	}
};

// create an order product
export const createOrderProduct = async (
	orderId: string,
	productId: string,
	quantity: number,
	priceInCents: number
) => {
	try {
		return await db.order_Product.create({
			data: {
				order_id: orderId,
				product_id: productId,
				quantity,
				priceInCents,
			},
		});
	} catch (error) {
		return error;
	}
};

// get order products by order id
export const getOrderProductsByOrderId = async (order_id: string) => {
	try {
		return await db.order_Product.findMany({
			where: {
				order_id,
			},
		});
	} catch (error) {
		return error;
	}
};

// get all order products
export const getOrderProducts = async () => {
	try {
		return await db.order_Product.findMany();
	} catch (error) {
		return error;
	}
};

// update an order's fulfillment status and/or tracking number
export const updateOrderFulfillment = async (
	orderId: string,
	data: { fulfilled?: boolean; trackingNumber?: string | null }
) => {
	try {
		return await db.order.update({
			where: { id: orderId },
			data,
		});
	} catch (error) {
		return error;
	}
};

// Mark an order refunded, and optionally return its items to stock, in one
// transaction. Resolves to false when someone else already recorded the refund,
// so a double click or a replay can never restock twice. Unlike the helpers
// above this one throws, so callers decide how to report a failure.
//
// A refund made through Stripe (`viaStripe`) may also match an order that the
// charge.refunded webhook marked a moment earlier, because Stripe can deliver
// that event before this transaction runs. Such an order has no stripeRefundId
// yet, and this claims it so the refund id, restock and email still happen.
export const markOrderRefunded = async (
	orderId: string,
	{
		refundedAmountInCents,
		stripeRefundId,
		restock,
		viaStripe,
	}: {
		refundedAmountInCents: number;
		stripeRefundId: string | null;
		restock: boolean;
		viaStripe: boolean;
	}
) => {
	return db.$transaction(async (tx) => {
		const claimed = await tx.order.updateMany({
			where: {
				id: orderId,
				...(viaStripe
					? { OR: [{ refundedAt: null }, { stripeRefundId: null }] }
					: { refundedAt: null }),
			},
			data: { refundedAt: new Date(), refundedAmountInCents, stripeRefundId },
		});
		if (claimed.count === 0) return false;

		if (restock) {
			const lines = await tx.order_Product.findMany({
				where: { order_id: orderId },
			});
			for (const line of lines) {
				// products without a stock number are not tracked, so leave them alone
				await tx.product.updateMany({
					where: { id: line.product_id, quantity: { not: null } },
					data: { quantity: { increment: line.quantity } },
				});
			}
		}
		return true;
	});
};

// Record a refund that happened outside the site (Stripe's charge.refunded
// webhook). The amount is always stored; the order only becomes "Refunded" once
// the charge is fully refunded. Does nothing for an order that is already
// marked refunded, or for a payment intent we have no order for.
export const recordStripeChargeRefund = async (
	stripePaymentIntentId: string,
	{ amountRefunded, fullyRefunded }: { amountRefunded: number; fullyRefunded: boolean }
) => {
	await db.order.updateMany({
		where: { stripePaymentIntentId, refundedAt: null },
		data: {
			refundedAmountInCents: amountRefunded,
			...(fullyRefunded ? { refundedAt: new Date() } : {}),
		},
	});
};
