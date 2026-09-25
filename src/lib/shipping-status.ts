// How far an order has got. No database access here, so both server and
// browser code can use it.

// how many of an order's packages (one per seller) have gone out
export type ShippingProgress = { shipped: number; total: number };

// The status word shown to customers and admins. "Partly shipped" is an order
// with some but not all of its packages out.
export const orderShippingLabel = (
	order: { fulfilled?: boolean | null; refundedAt?: Date | null },
	progress?: ShippingProgress
) =>
	order.refundedAt
		? 'Refunded'
		: order.fulfilled
			? 'Shipped'
			: progress && progress.shipped > 0 && progress.shipped < progress.total
				? 'Partly shipped'
				: 'Processing';
