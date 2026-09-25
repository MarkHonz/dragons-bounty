import { Prisma } from '@prisma/client';

import db from '@/db/db';
import type { ShippingProgress } from '@/lib/shipping-status';

type Tx = Prisma.TransactionClient;

// Every seller with items in the order ("" = the shop).
const sellersInOrder = async (tx: Tx, orderId: string) => {
	const lines = await tx.order_Product.findMany({
		where: { order_id: orderId },
		select: { artistId: true },
	});
	return Array.from(new Set(lines.map((line) => line.artistId)));
};

// Order.fulfilled means "every seller in this order has shipped". Called in the
// same transaction as any change to the order's packages, so the two can never
// disagree.
const recomputeFulfilled = async (tx: Tx, orderId: string) => {
	const [sellers, shipped] = await Promise.all([
		sellersInOrder(tx, orderId),
		tx.shipment.findMany({ where: { orderId }, select: { sellerId: true } }),
	]);
	const shippedSet = new Set(shipped.map((s) => s.sellerId));
	const fulfilled =
		sellers.length > 0 && sellers.every((seller) => shippedSet.has(seller));
	await tx.order.update({ where: { id: orderId }, data: { fulfilled } });
	return fulfilled;
};

export type ShipResult =
	| { status: 'shipped'; orderFulfilled: boolean }
	| { status: 'updated' } // the package was already shipped: only the tracking changed
	| { status: 'unchanged' }
	| { status: 'not-found' } // no such order, or it has nothing from this seller
	| { status: 'refunded' };

// Mark one seller's package in an order shipped with a tracking number, or
// correct the tracking number of a package already shipped. Throws on a
// database error.
export const shipPackage = async ({
	orderId,
	sellerId,
	trackingNumber,
	actorId,
}: {
	orderId: string;
	sellerId: string;
	trackingNumber: string;
	actorId: string;
}): Promise<ShipResult> =>
	db.$transaction(async (tx) => {
		const order = await tx.order.findUnique({
			where: { id: orderId },
			select: { refundedAt: true },
		});
		if (!order) return { status: 'not-found' };
		if (order.refundedAt) return { status: 'refunded' };
		const hasLines = await tx.order_Product.count({
			where: { order_id: orderId, artistId: sellerId },
		});
		if (hasLines === 0) return { status: 'not-found' };

		const existing = await tx.shipment.findUnique({
			where: { orderId_sellerId: { orderId, sellerId } },
		});
		if (existing) {
			if (existing.trackingNumber === trackingNumber) return { status: 'unchanged' };
			await tx.shipment.update({
				where: { id: existing.id },
				data: { trackingNumber },
			});
			return { status: 'updated' };
		}
		await tx.shipment.create({
			data: { orderId, sellerId, trackingNumber, shippedById: actorId },
		});
		const orderFulfilled = await recomputeFulfilled(tx, orderId);
		return { status: 'shipped', orderFulfilled };
	});

// Take back a "shipped" (admin only). Resolves to false when there was nothing
// to undo.
export const unshipPackage = async (orderId: string, sellerId: string) =>
	db.$transaction(async (tx) => {
		const removed = await tx.shipment.deleteMany({ where: { orderId, sellerId } });
		if (removed.count === 0) return false;
		await recomputeFulfilled(tx, orderId);
		return true;
	});

export type OrderPackage = {
	sellerId: string;
	// the public artist name, or null for the shop (or an artist since deleted)
	sellerName: string | null;
	// the seller is an artist right now (so their artist page exists)
	sellerIsArtist: boolean;
	lines: {
		productId: string;
		productName: string;
		variantName: string;
		quantity: number;
		priceInCents: number;
	}[];
	shipment: {
		trackingNumber: string | null;
		shippedAt: Date;
	} | null;
};

// An order's items grouped into one package per seller, the shop's first, each
// with its shipment if it has gone out.
export const getOrderPackages = async (orderId: string): Promise<OrderPackage[]> => {
	const [lines, shipments] = await Promise.all([
		db.order_Product.findMany({
			where: { order_id: orderId },
			include: { Product: { select: { name: true } } },
		}),
		db.shipment.findMany({ where: { orderId } }),
	]);
	const artistIds = Array.from(
		new Set(lines.map((line) => line.artistId).filter(Boolean))
	);
	const artists = await db.user.findMany({
		where: { id: { in: artistIds } },
		select: { id: true, artistName: true, isArtist: true },
	});
	const names = new Map(artists.map((a) => [a.id, a.artistName]));
	const current = new Set(artists.filter((a) => a.isArtist).map((a) => a.id));
	const bySeller = new Map<string, OrderPackage>();
	for (const line of lines) {
		let pkg = bySeller.get(line.artistId);
		if (!pkg) {
			const shipment = shipments.find((s) => s.sellerId === line.artistId);
			pkg = {
				sellerId: line.artistId,
				sellerName: line.artistId ? names.get(line.artistId) ?? null : null,
				sellerIsArtist: current.has(line.artistId),
				lines: [],
				shipment: shipment
					? { trackingNumber: shipment.trackingNumber, shippedAt: shipment.shippedAt }
					: null,
			};
			bySeller.set(line.artistId, pkg);
		}
		pkg.lines.push({
			productId: line.product_id,
			productName: line.Product.name,
			variantName: line.variantName,
			quantity: line.quantity,
			priceInCents: line.priceInCents,
		});
	}
	return Array.from(bySeller.values()).sort((a, b) =>
		a.sellerId === b.sellerId
			? 0
			: a.sellerId === ''
				? -1
				: b.sellerId === ''
					? 1
					: (a.sellerName ?? '').localeCompare(b.sellerName ?? '')
	);
};

export const getShippingProgress = async (
	orderIds: string[]
): Promise<Map<string, ShippingProgress>> => {
	if (orderIds.length === 0) return new Map();
	const [lines, shipments] = await Promise.all([
		db.order_Product.findMany({
			where: { order_id: { in: orderIds } },
			select: { order_id: true, artistId: true },
		}),
		db.shipment.findMany({
			where: { orderId: { in: orderIds } },
			select: { orderId: true, sellerId: true },
		}),
	]);
	const sellers = new Map<string, Set<string>>();
	for (const line of lines) {
		if (!sellers.has(line.order_id)) sellers.set(line.order_id, new Set());
		sellers.get(line.order_id)!.add(line.artistId);
	}
	const result = new Map<string, ShippingProgress>();
	for (const id of orderIds) {
		const orderSellers = sellers.get(id) ?? new Set<string>();
		const shipped = shipments.filter(
			(s) => s.orderId === id && orderSellers.has(s.sellerId)
		).length;
		result.set(id, { shipped, total: orderSellers.size });
	}
	return result;
};
