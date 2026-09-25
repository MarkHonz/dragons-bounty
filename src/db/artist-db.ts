import db from '@/db/db';
import { startOfShopMonth } from '@/lib/shop-time';

export const MIN_ARTIST_NAME_LENGTH = 2;
export const MAX_ARTIST_NAME_LENGTH = 60;

// Every artist, for the "Artist" dropdown on the product form.
export const getArtists = async () =>
	db.user.findMany({
		where: { isArtist: true },
		select: { id: true, artistName: true, email: true },
		orderBy: { artistName: 'asc' },
	});

export const isArtistAccount = async (userId: string) => {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { isArtist: true },
	});
	return user?.isArtist === true;
};

// Orders that still need this seller to ship: not refunded, with items from
// them, and no package from them yet.
const unshippedWhere = (sellerId: string) => ({
	refundedAt: null,
	Order_Products: { some: { artistId: sellerId } },
	shipments: { none: { sellerId } },
});

export const countUnshippedForSeller = async (sellerId: string) =>
	db.order.count({ where: unshippedWhere(sellerId) });

export type ArtistStatusResult =
	| 'changed'
	| 'unchanged'
	| 'not-found'
	| 'unverified'
	| 'name-taken';

// Make someone an artist (with their public name), rename one, or remove the
// status. Their products and past orders are never touched. Throws on a
// database error.
export const setArtistStatus = async (
	userId: string,
	change: { isArtist: true; artistName: string } | { isArtist: false }
): Promise<ArtistStatusResult> =>
	db.$transaction(async (tx) => {
		const user = await tx.user.findUnique({
			where: { id: userId },
			select: { isArtist: true, artistName: true, emailVerified: true },
		});
		if (!user) return 'not-found';
		if (!change.isArtist) {
			if (!user.isArtist) return 'unchanged';
			// the name is kept, so "Made by" still reads correctly on their products
			await tx.user.update({ where: { id: userId }, data: { isArtist: false } });
			return 'changed';
		}
		if (!user.emailVerified) return 'unverified';
		if (user.isArtist && user.artistName === change.artistName) return 'unchanged';
		// two artists with the same name would be impossible to tell apart
		const others = await tx.user.findMany({
			where: { isArtist: true, id: { not: userId } },
			select: { artistName: true },
		});
		const wanted = change.artistName.toLowerCase();
		if (others.some((other) => other.artistName?.toLowerCase() === wanted)) {
			return 'name-taken';
		}
		await tx.user.update({
			where: { id: userId },
			data: { isArtist: true, artistName: change.artistName },
		});
		return 'changed';
	});

type SellerLine = {
	productId: string;
	productName: string;
	variantName: string;
	quantity: number;
	priceInCents: number;
};

export type ArtistOrder = {
	orderId: string;
	createdAt: Date;
	refunded: boolean;
	lines: SellerLine[];
	// only what's needed to ship: never the buyer's email or the order totals
	shipTo: {
		name: string | null;
		address1: string | null;
		address2: string | null;
		city: string | null;
		state: string | null;
		zip: string | null;
	};
	shipment: { trackingNumber: string | null; shippedAt: Date } | null;
};

const SHIPPED_SHOWN = 50;

// Everything the artist page shows, for one artist. Only this seller's lines
// are read, and the order is reduced to its date and shipping address.
export const getArtistPageData = async (artistId: string) => {
	const artist = await db.user.findUnique({
		where: { id: artistId },
		select: { id: true, isArtist: true, artistName: true },
	});
	if (!artist?.isArtist) return null;

	const orderSelect = {
		id: true,
		createdAt: true,
		refundedAt: true,
		shipToName: true,
		shipToAddress1: true,
		shipToAddress2: true,
		shipToCity: true,
		shipToState: true,
		shipToZip: true,
		Order_Products: {
			where: { artistId },
			select: {
				product_id: true,
				variantName: true,
				quantity: true,
				priceInCents: true,
				Product: { select: { name: true } },
			},
		},
		shipments: {
			where: { sellerId: artistId },
			select: { trackingNumber: true, shippedAt: true },
		},
	} as const;

	const [toShipRaw, refundedUnshippedRaw, shippedRaw, products, soldLines] =
		await Promise.all([
			db.order.findMany({
				where: unshippedWhere(artistId),
				orderBy: { createdAt: 'asc' },
				select: orderSelect,
			}),
			// refunded before this artist shipped: shown so they know not to send it
			db.order.findMany({
				where: {
					refundedAt: { not: null },
					Order_Products: { some: { artistId } },
					shipments: { none: { sellerId: artistId } },
				},
				orderBy: { createdAt: 'desc' },
				take: 20,
				select: orderSelect,
			}),
			db.order.findMany({
				where: { shipments: { some: { sellerId: artistId } } },
				orderBy: { createdAt: 'desc' },
				take: SHIPPED_SHOWN,
				select: orderSelect,
			}),
			db.product.findMany({
				where: { artistId },
				orderBy: { name: 'asc' },
				select: {
					id: true,
					name: true,
					priceInCents: true,
					quantity: true,
					isAvailable: true,
					category: { select: { name: true, isActive: true } },
					images: { orderBy: { position: 'asc' }, take: 1, select: { path: true } },
					variants: {
						orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
						select: { id: true, name: true, quantity: true, priceInCents: true },
					},
				},
			}),
			db.order_Product.findMany({
				where: { artistId, Order: { refundedAt: null } },
				select: {
					product_id: true,
					quantity: true,
					priceInCents: true,
					Product: { select: { name: true } },
					Order: { select: { createdAt: true } },
				},
			}),
		]);

	const toArtistOrder = (order: (typeof toShipRaw)[number]): ArtistOrder => ({
		orderId: order.id,
		createdAt: order.createdAt,
		refunded: order.refundedAt != null,
		lines: order.Order_Products.map((line) => ({
			productId: line.product_id,
			productName: line.Product.name,
			variantName: line.variantName,
			quantity: line.quantity,
			priceInCents: line.priceInCents,
		})),
		shipTo: {
			name: order.shipToName,
			address1: order.shipToAddress1,
			address2: order.shipToAddress2,
			city: order.shipToCity,
			state: order.shipToState,
			zip: order.shipToZip,
		},
		shipment: order.shipments[0] ?? null,
	});

	const shipped = shippedRaw
		.map(toArtistOrder)
		.sort(
			(a, b) =>
				(b.shipment?.shippedAt.getTime() ?? 0) - (a.shipment?.shippedAt.getTime() ?? 0)
		);

	return {
		artist: { id: artist.id, name: artist.artistName ?? 'Artist' },
		toShip: toShipRaw.map(toArtistOrder),
		refundedUnshipped: refundedUnshippedRaw.map(toArtistOrder),
		shipped,
		products,
		sales: summarizeSales(
			soldLines.map((line) => ({
				productId: line.product_id,
				productName: line.Product.name,
				quantity: line.quantity,
				priceInCents: line.priceInCents,
				createdAt: line.Order.createdAt,
			})),
			new Date()
		),
	};
};

export type SalesSummary = ReturnType<typeof summarizeSales>;

// Item counts and item totals (price x quantity), for this shop month and
// all time, plus a per-product breakdown (best-selling first). Pure, so it can
// be unit tested. `now` decides which month "this month" is.
export const summarizeSales = (
	lines: {
		productId: string;
		productName: string;
		quantity: number;
		priceInCents: number;
		createdAt: Date;
	}[],
	now: Date
) => {
	// the shop's month (its own time zone), same as the admin dashboard
	const monthStart = startOfShopMonth(now);
	const month = { items: 0, totalInCents: 0 };
	const allTime = { items: 0, totalInCents: 0 };
	const byProduct = new Map<
		string,
		{ productId: string; productName: string; items: number; totalInCents: number }
	>();
	for (const line of lines) {
		const amount = line.priceInCents * line.quantity;
		allTime.items += line.quantity;
		allTime.totalInCents += amount;
		if (line.createdAt >= monthStart) {
			month.items += line.quantity;
			month.totalInCents += amount;
		}
		const entry = byProduct.get(line.productId) ?? {
			productId: line.productId,
			productName: line.productName,
			items: 0,
			totalInCents: 0,
		};
		entry.items += line.quantity;
		entry.totalInCents += amount;
		byProduct.set(line.productId, entry);
	}
	return {
		month,
		allTime,
		byProduct: Array.from(byProduct.values()).sort(
			(a, b) => b.totalInCents - a.totalInCents || a.productName.localeCompare(b.productName)
		),
	};
};
