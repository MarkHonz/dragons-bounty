import { Prisma } from '@prisma/client';

import db from '@/db/db';
import { formatVariantLabel } from '@/lib/variants';
import type { ExportOrderRow } from '@/lib/csv';
import type { OrderDateRange } from '@/lib/date-range';

export type OrderProps = {
	id: string;
	productTotalInCents: number;
	taxTotalInCents: number;
	shippingTotalInCents: number;
	totalInCents: number;
	// taken off the items total by a discount code (0 when none was used)
	discountInCents?: number;
	discountCode?: string | null;
	profileId: string;
	createdAt: Date;
	fulfilled?: boolean;
	trackingNumber?: string;
	stripePaymentIntentId?: string | null;
	// how many admin notes the order has, and the customer's email (both only
	// set by the admin orders list)
	noteCount?: number;
	customerEmail?: string;
	refundedAt?: Date | null;
	refundedAmountInCents?: number | null;
	stripeRefundId?: string | null;
	shipToName?: string | null;
	shipToAddress1?: string | null;
	shipToAddress2?: string | null;
	shipToCity?: string | null;
	shipToState?: string | null;
	shipToZip?: string | null;
};

export type OrderProductProps = {
	order_id: string;
	product_id: string;
	// "" and "" when the product has no options
	variant_id: string;
	variantName: string;
	quantity: number;
	priceInCents: number;
};

type CreateOrderProps = {
	productTotalInCents: number;
	taxTotalInCents: number;
	shippingTotalInCents: number;
	totalInCents: number;
	discountInCents?: number;
	discountCode?: string | null;
	profileId: string;
	stripePaymentIntentId?: string;
	// the shipping address as it was at checkout
	shipToName?: string | null;
	shipToAddress1?: string | null;
	shipToAddress2?: string | null;
	shipToCity?: string | null;
	shipToState?: string | null;
	shipToZip?: string | null;
};

// create an order for a user profile
export const createOrder = async ({
	productTotalInCents,
	taxTotalInCents,
	shippingTotalInCents,
	totalInCents,
	discountInCents,
	discountCode,
	profileId,
	stripePaymentIntentId,
	shipToName,
	shipToAddress1,
	shipToAddress2,
	shipToCity,
	shipToState,
	shipToZip,
}: CreateOrderProps) => {
	try {
		return await db.order.create({
			data: {
				productTotalInCents,
				taxTotalInCents,
				shippingTotalInCents,
				totalInCents,
				discountInCents: discountInCents ?? 0,
				discountCode: discountCode ?? null,
				stripePaymentIntentId,
				shipToName,
				shipToAddress1,
				shipToAddress2,
				shipToCity,
				shipToState,
				shipToZip,
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
			// newest first
			orderBy: { createdAt: 'desc' },
		});
	} catch (error) {
		return error;
	}
};

// A customer's latest orders for the Account page, and how many they have in all.
export const getRecentOrdersByProfileId = async (profileId: string, take: number) => {
	const [orders, total] = await Promise.all([
		db.order.findMany({
			where: { profileId },
			orderBy: { createdAt: 'desc' },
			take,
			select: {
				id: true,
				createdAt: true,
				totalInCents: true,
				fulfilled: true,
				refundedAt: true,
			},
		}),
		db.order.count({ where: { profileId } }),
	]);
	return { orders, total };
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

// The order states the admin can filter by. "shipping" is an order that still
// needs to go out: not shipped and not refunded. The dashboard counts use the
// same rules, so its numbers always match the filtered list.
export const ORDER_STATUS_FILTERS = ['shipping', 'fulfilled', 'refunded'] as const;
export type OrderStatusFilter = (typeof ORDER_STATUS_FILTERS)[number];

const orderStatusWhere: Record<OrderStatusFilter, Prisma.OrderWhereInput> = {
	shipping: { fulfilled: false, refundedAt: null },
	fulfilled: { fulfilled: true, refundedAt: null },
	refunded: { refundedAt: { not: null } },
};

export const parseOrderStatusFilter = (
	value: string | undefined
): OrderStatusFilter | undefined =>
	ORDER_STATUS_FILTERS.find((status) => status === value);

// get all orders, newest first, optionally only those in one state, each with
// how many admin notes it has and the customer's email. Only the email is taken
// from the account: this list goes to a client component.
export const getOrders = async (status?: OrderStatusFilter) => {
	try {
		const orders = await db.order.findMany({
			where: status ? orderStatusWhere[status] : undefined,
			orderBy: { createdAt: 'desc' },
			include: {
				_count: { select: { notes: true } },
				profile: { select: { user: { select: { email: true } } } },
			},
		});
		return orders.map(({ _count, profile, ...order }) => ({
			...order,
			noteCount: _count.notes,
			customerEmail: profile.user.email,
		}));
	} catch (error) {
		return error;
	}
};

// The orders in the same state as the filter tab (and, optionally, placed within
// a range of days), with what a spreadsheet needs: the customer's name and email
// and the items as a line of text.
export const getOrdersForExport = async (
	status?: OrderStatusFilter,
	range?: OrderDateRange
): Promise<ExportOrderRow[]> => {
	const orders = await db.order.findMany({
		where: {
			...(status ? orderStatusWhere[status] : {}),
			...(range?.start || range?.endExclusive
				? {
						createdAt: {
							...(range.start ? { gte: range.start } : {}),
							...(range.endExclusive ? { lt: range.endExclusive } : {}),
						},
					}
				: {}),
		},
		orderBy: { createdAt: 'desc' },
		include: {
			Order_Products: true,
			profile: { select: { name: true, user: { select: { email: true } } } },
		},
	});
	const productIds = Array.from(
		new Set(orders.flatMap((order) => order.Order_Products.map((l) => l.product_id)))
	);
	const products = await db.product.findMany({
		where: { id: { in: productIds } },
		select: { id: true, name: true },
	});
	const names = new Map(products.map((product) => [product.id, product.name]));

	return orders.map((order) => ({
		id: order.id,
		createdAt: order.createdAt,
		status: order.refundedAt
			? 'Refunded'
			: order.fulfilled
				? 'Fulfilled'
				: 'Processing',
		customerName: order.profile.name,
		customerEmail: order.profile.user.email,
		shipToName: order.shipToName,
		shipToAddress1: order.shipToAddress1,
		shipToAddress2: order.shipToAddress2,
		shipToCity: order.shipToCity,
		shipToState: order.shipToState,
		shipToZip: order.shipToZip,
		items: order.Order_Products.map(
			(line) =>
				`${line.quantity} x ${formatVariantLabel(
					names.get(line.product_id) ?? 'Item',
					line.variantName
				)}`
		).join('; '),
		productTotalInCents: order.productTotalInCents,
		discountCode: order.discountCode,
		discountInCents: order.discountInCents,
		shippingTotalInCents: order.shippingTotalInCents,
		taxTotalInCents: order.taxTotalInCents,
		totalInCents: order.totalInCents,
		refundedAmountInCents: order.refundedAmountInCents,
		trackingNumber: order.trackingNumber,
		stripePaymentIntentId: order.stripePaymentIntentId,
	}));
};

export const getOrderStatusCounts = async () => {
	const [all, shipping, fulfilled, refunded] = await Promise.all([
		db.order.count(),
		db.order.count({ where: orderStatusWhere.shipping }),
		db.order.count({ where: orderStatusWhere.fulfilled }),
		db.order.count({ where: orderStatusWhere.refunded }),
	]);
	return { all, shipping, fulfilled, refunded };
};

// create an order product
export const createOrderProduct = async (
	orderId: string,
	productId: string,
	// the option bought and its name at the time ("" for a product without options)
	variantId: string,
	variantName: string,
	quantity: number,
	priceInCents: number
) => {
	try {
		return await db.order_Product.create({
			data: {
				order_id: orderId,
				product_id: productId,
				variant_id: variantId,
				variantName,
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
				if (line.variant_id) {
					// an option is stocked on its own
					await tx.productVariant.updateMany({
						where: { id: line.variant_id, productId: line.product_id },
						data: { quantity: { increment: line.quantity } },
					});
				} else {
					// products without a stock number are not tracked, so leave them alone
					await tx.product.updateMany({
						where: { id: line.product_id, quantity: { not: null } },
						data: { quantity: { increment: line.quantity } },
					});
				}
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
