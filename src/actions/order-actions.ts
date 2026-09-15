'use server';

import { revalidatePath } from 'next/cache';
import { assertAdminOrThrow } from '@/lib/auth';
import { updateOrderFulfillment } from '@/db/orders-db';

export const updateOrderFulfillmentAction = async (formData: FormData) => {
	await assertAdminOrThrow();

	const orderId = formData.get('orderId')?.toString();
	if (!orderId) return;

	const fulfilled = formData.get('fulfilled') === 'on';
	const trackingNumber = formData.get('trackingNumber')?.toString() || null;

	await updateOrderFulfillment(orderId, { fulfilled, trackingNumber });

	revalidatePath('/admin/orders');
	revalidatePath(`/admin/orders/${orderId}`);
};
