import db from '@/db/db';
import { getOrderStatusCounts } from '@/db/orders-db';
import { countStock } from '@/lib/stock';

// Numbers for the admin dashboard's "Needs attention" row. The order and stock
// counts come from the same rules the Orders and Products filters use.
export const getAdminOverview = async () => {
	// "today" is the server's local calendar day
	const startOfToday = new Date();
	startOfToday.setHours(0, 0, 0, 0);

	const [orderCounts, products, today] = await Promise.all([
		getOrderStatusCounts(),
		db.product.findMany({
			select: { quantity: true, variants: { select: { quantity: true } } },
		}),
		// fully refunded orders don't count as sales
		db.order.aggregate({
			where: { createdAt: { gte: startOfToday }, refundedAt: null },
			_sum: { totalInCents: true, refundedAmountInCents: true },
			_count: true,
		}),
	]);
	const stock = countStock(products);

	return {
		ordersToShip: orderCounts.shipping,
		soldOut: stock.out,
		// a part-refunded order (refunded in Stripe, not yet fully) counts for what is left
		todaySalesInCents:
			(today._sum.totalInCents ?? 0) - (today._sum.refundedAmountInCents ?? 0),
		todayOrders: today._count,
	};
};
