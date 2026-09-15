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
		return await db.order.findMany();
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

// get unfulfilled orders
export const getUnfulfilledOrders = async () => {
	try {
		return await db.order.findMany({
			where: {
				fulfilled: false,
			},
		});
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
