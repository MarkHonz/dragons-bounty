import db from '@/db/db';

export type CartProps = {
	id: string;
	quantity: number;
	cart_id: string;
	product_id: string;
};

type AddItemToCartProps = {
	cartId: string;
	productId: string;
	quantity: number;
};

// function to put a product in the cart
export const addItemToCart = async ({
	cartId,
	productId,
	quantity,
}: AddItemToCartProps) => {
	try {
		return await db.cart_Product.create({
			data: {
				quantity,
				cart_id: cartId,
				product_id: productId,
			},
		});
	} catch (error) {
		console.error(error);
		return error;
	}
};

// function to get the cart by the cartId
export const getCartById = async (cartId: string) => {
	try {
		return await db.cart_Product.findMany({
			where: {
				cart_id: cartId,
			},
		});
	} catch (error) {
		console.error(error);
		return error;
	}
};

// function to delete a product from the cart
export const deleteCartItem = async (cartId: string, productId: string) => {
	try {
		return await db.cart_Product.deleteMany({
			where: {
				cart_id: cartId,
				product_id: productId,
			},
		});
	} catch (error) {
		console.error(error);
		return error;
	}
};

// function to update the quantity of a product in the cart
export const updateCartItemQuantity = async ({
	cartId,
	productId,
	quantity,
}: AddItemToCartProps) => {
	try {
		return await db.cart_Product.update({
			where: {
				cart_id_product_id: {
					cart_id: cartId,
					product_id: productId,
				},
			},
			data: {
				quantity,
			},
		});
	} catch (error) {
		console.error(error);
		return error;
	}
};

// function to delete the cart
export const deleteCart = async (cartId: string) => {
	try {
		return await db.cart_Product.deleteMany({
			where: {
				cart_id: cartId,
			},
		});
	} catch (error) {
		console.error(error);
		return error;
	}
};

// function to get the cartId from the userId
export const getCartIdByUserId = async (userId: string) => {
	try {
		const profile = await db.profile.findUnique({
			include: {
				Cart: true,
			},
			where: {
				userId: userId,
			},
		});
		return profile?.Cart?.id;
	} catch (error) {
		console.error(error);
		return error;
	}
};

// function to check if the product is already in the cart
export const isProductInCart = async (cartId: string, productId: string) => {
	try {
		const product = await db.cart_Product.findFirst({
			where: {
				cart_id: cartId,
				product_id: productId,
			},
		});
		return product ? true : false;
	} catch (error) {
		console.error(error);
		return error;
	}
};

// function to get the quantity of a product in the cart
export const getProductQuantityInCart = async (
	cartId: string,
	productId: string
) => {
	try {
		const product = await db.cart_Product.findFirst({
			where: {
				cart_id: cartId,
				product_id: productId,
			},
		});
		return product?.quantity;
	} catch (error) {
		console.error(error);
		return error;
	}
};
