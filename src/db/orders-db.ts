import db from '@/db/db';

export type OrderProps = {
	id: string;
	productTotalInCents: number;
	taxTotalInCents: number;
	shippingTotalInCents: number;
	totalInCents: number;
	profileId: string;
	createdAt: Date;
	fulfilled: boolean;
	trackingNumber?: string;
};

export type OrderProductProps = {
	order_id: string;
	product_id: string;
	quantity: number;
	priceInCents: number;
};

// create an order for a user profile
export const createOrder = async ({
	productTotalInCents,
	taxTotalInCents,
	shippingTotalInCents,
	totalInCents,
	profileId,
}: OrderProps) => {
	try {
		return await db.order.create({
			data: {
				productTotalInCents,
				taxTotalInCents,
				shippingTotalInCents,
				totalInCents,
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
	quantity: number
) => {
	try {
		return await db.order_Product.create({
			data: {
				order_id: orderId,
				product_id: productId,
				quantity,
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

// delete all order products
export const deleteOrderProducts = async () => {
	try {
		return await db.order_Product.deleteMany();
	} catch (error) {
		return error;
	}
};

// delete all orders
export const deleteOrders = async () => {
	try {
		return await db.order.deleteMany();
	} catch (error) {
		return error;
	}
};
