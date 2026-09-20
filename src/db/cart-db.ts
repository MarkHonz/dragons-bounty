import db from '@/db/db';
import { getPurchaseInfo } from '@/db/product-db';

export type CartProps = {
	id: string;
	quantity: number;
	cart_id: string;
	product_id: string;
	// "" when the product has no options
	variant_id: string;
};

export type EnrichedCartItem = {
	productId: string;
	// "" when the product has no options
	variantId: string;
	name: string;
	// the option's name, "" when the product has no options
	variantName: string;
	quantity: number;
	price: number;
	cartId: string;
	// null when stock isn't tracked
	numberInStock: number | null;
	// false when the product has been switched off (or its category has)
	isAvailable: boolean;
};

type AddItemToCartProps = {
	cartId: string;
	productId: string;
	// the chosen option; "" for a product without options
	variantId?: string;
	quantity: number;
};

// function to put a product in the cart
export const addItemToCart = async ({
	cartId,
	productId,
	variantId = '',
	quantity,
}: AddItemToCartProps) => {
	try {
		return await db.cart_Product.create({
			data: {
				quantity,
				cart_id: cartId,
				product_id: productId,
				variant_id: variantId,
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
export const deleteCartItem = async (
	cartId: string,
	productId: string,
	variantId = ''
) => {
	try {
		return await db.cart_Product.deleteMany({
			where: {
				cart_id: cartId,
				product_id: productId,
				variant_id: variantId,
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
	variantId = '',
	quantity,
}: AddItemToCartProps) => {
	try {
		return await db.cart_Product.update({
			where: {
				cart_id_product_id_variant_id: {
					cart_id: cartId,
					product_id: productId,
					variant_id: variantId,
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

// function to get the DB cart for a user, enriched with product name, option,
// price and stock
export const getEnrichedCartByUserId = async (
	userId: string
): Promise<{ cartId: string; items: EnrichedCartItem[] }> => {
	const cartId = (await getCartIdByUserId(userId)) as string;
	if (!cartId) {
		return { cartId: '', items: [] };
	}

	const cartItems = (await getCartById(cartId)) as CartProps[];

	const items = await Promise.all(
		cartItems.map(async (item): Promise<EnrichedCartItem> => {
			// one answer for price, stock and whether the line can still be bought
			const info = await getPurchaseInfo(item.product_id, item.variant_id);
			return {
				productId: item.product_id,
				variantId: item.variant_id,
				name: info?.productName ?? 'Item no longer available',
				variantName: info?.variantName ?? '',
				quantity: item.quantity,
				price: info?.priceInCents ?? 0,
				cartId,
				numberInStock: info ? info.quantity : 0,
				isAvailable: info?.buyable ?? false,
			};
		})
	);

	return { cartId, items };
};
