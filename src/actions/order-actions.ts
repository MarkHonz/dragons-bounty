'use server';

import { deleteOrderProducts, deleteOrders } from '@/db/orders-db';
import { revalidatePath } from 'next/cache';

// delete all order products then delete all orders
export const deleteAllOrderProducts = async (): Promise<void> => {
	try {
		await Promise.all([deleteOrderProducts(), deleteOrders()]);
		revalidatePath('/orders');
		// success
	} catch (error) {
		throw error;
	}
};
