import db from '@/db/db';
import { getOrderStatusCounts } from '@/db/orders-db';
import { getShippingProgress } from '@/db/shipment-db';
import { countStock } from '@/lib/stock';
import { salesWindowStart, summarizeDashboardSales } from '@/lib/sales-stats';
import { startOfShopMonth } from '@/lib/shop-time';
import { orderShippingLabel } from '@/lib/shipping-status';

const RECENT_ORDERS = 8;
const RECENT_ACTIVITY = 6;

// Everything the admin dashboard shows. The order and stock counts use the same
// rules as the Orders and Products filters, so the numbers always match those
// pages. "Today" and "this month" are the shop's (see src/lib/shop-time.ts).
// Only what the page shows leaves here: never password hashes or payment ids.
export const getAdminOverview = async (now = new Date()) => {
	const [
		orderCounts,
		products,
		oldestToShip,
		salesOrders,
		recent,
		activity,
		customers,
		newCustomers,
		artists,
	] = await Promise.all([
		getOrderStatusCounts(),
		db.product.findMany({
			select: {
				quantity: true,
				isAvailable: true,
				category: { select: { isActive: true } },
				variants: { select: { quantity: true } },
			},
		}),
		// the order that has waited longest for (at least one) package to go out
		db.order.findFirst({
			where: { fulfilled: false, refundedAt: null },
			orderBy: { createdAt: 'asc' },
			select: { createdAt: true },
		}),
		db.order.findMany({
			where: { createdAt: { gte: salesWindowStart(now) } },
			select: { createdAt: true, totalInCents: true, refundedAmountInCents: true },
		}),
		db.order.findMany({
			orderBy: { createdAt: 'desc' },
			take: RECENT_ORDERS,
			select: {
				id: true,
				createdAt: true,
				totalInCents: true,
				fulfilled: true,
				refundedAt: true,
				profile: { select: { name: true, user: { select: { email: true } } } },
			},
		}),
		db.activityLog.findMany({
			orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
			take: RECENT_ACTIVITY,
			select: {
				id: true,
				createdAt: true,
				summary: true,
				actorName: true,
				actorEmail: true,
				orderId: true,
			},
		}),
		db.user.count(),
		db.user.count({ where: { createdAt: { gte: startOfShopMonth(now) } } }),
		db.user.count({ where: { isArtist: true } }),
	]);

	const stock = countStock(products);
	const progress = await getShippingProgress(recent.map((order) => order.id));

	return {
		ordersToShip: orderCounts.shipping,
		oldestToShipAt: oldestToShip?.createdAt ?? null,
		soldOut: stock.out,
		sales: summarizeDashboardSales(salesOrders, now),
		recentOrders: recent.map((order) => ({
			id: order.id,
			createdAt: order.createdAt,
			totalInCents: order.totalInCents,
			customerName: order.profile.name,
			customerEmail: order.profile.user.email,
			status: orderShippingLabel(order, progress.get(order.id)),
		})),
		activity,
		counts: {
			customers,
			newCustomers,
			productsForSale: products.filter(
				(product) => product.isAvailable && product.category.isActive
			).length,
			artists,
		},
	};
};

export type AdminOverview = Awaited<ReturnType<typeof getAdminOverview>>;
