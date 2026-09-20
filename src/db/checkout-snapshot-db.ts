import db from '@/db/db';

// One line of the cart exactly as the customer was shown it at checkout: the
// name, the option, the price they were quoted and how many.
export type SnapshotLine = {
	productId: string;
	// "" when the product has no options
	variantId: string;
	name: string;
	variantName: string;
	unitPriceInCents: number;
	quantity: number;
};

// Stripe only allows 500 characters of metadata on a payment, far too little for
// a real cart, so the cart is kept here, keyed by the payment's id. The Stripe
// webhook reads it back when the payment succeeds, so the order is built from
// what the customer saw and paid for, not from whatever prices are current later.
export const createCheckoutSnapshot = async ({
	paymentIntentId,
	userId,
	cartId,
	lines,
}: {
	paymentIntentId: string;
	userId: string;
	cartId: string;
	lines: SnapshotLine[];
}) => {
	await db.checkoutSnapshot.create({
		data: { paymentIntentId, userId, cartId, itemsJson: JSON.stringify(lines) },
	});
};

const isLine = (value: unknown): value is SnapshotLine => {
	const line = value as SnapshotLine;
	return (
		typeof line === 'object' &&
		line !== null &&
		typeof line.productId === 'string' &&
		typeof line.variantId === 'string' &&
		typeof line.name === 'string' &&
		typeof line.variantName === 'string' &&
		Number.isInteger(line.unitPriceInCents) &&
		Number.isInteger(line.quantity)
	);
};

// Null when there is no snapshot for this payment (one started before snapshots
// existed) or it can't be read.
export const getCheckoutSnapshot = async (paymentIntentId: string) => {
	const row = await db.checkoutSnapshot.findUnique({ where: { paymentIntentId } });
	if (!row) return null;
	try {
		const lines: unknown = JSON.parse(row.itemsJson);
		if (!Array.isArray(lines) || !lines.every(isLine)) return null;
		return { userId: row.userId, cartId: row.cartId, lines: lines as SnapshotLine[] };
	} catch {
		return null;
	}
};

export const deleteCheckoutSnapshot = async (paymentIntentId: string) => {
	await db.checkoutSnapshot.deleteMany({ where: { paymentIntentId } });
};

// Checkouts that were started and never paid leave a snapshot behind; drop the
// old ones so the table doesn't grow forever.
export const sweepOldCheckoutSnapshots = async (olderThanDays = 7) => {
	await db.checkoutSnapshot.deleteMany({
		where: {
			createdAt: { lt: new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000) },
		},
	});
};
