// A product with this many or fewer left is flagged "Low". Change it here.
export const LOW_STOCK_THRESHOLD = 3;

export type StockStatus = 'untracked' | 'sold-out' | 'low' | 'ok';

// Products without a stock number are not tracked, so they are never flagged.
export const getStockStatus = (
	quantity: number | null | undefined
): StockStatus => {
	if (quantity == null) return 'untracked';
	if (quantity <= 0) return 'sold-out';
	if (quantity <= LOW_STOCK_THRESHOLD) return 'low';
	return 'ok';
};

// The stock filters the admin can pick, as they appear in the URL (?stock=out).
// Most products here are hand-made and one of a kind, so a "low stock"
// threshold isn't meaningful to this client; only sold-out is offered.
export type StockFilter = 'out';

export const parseStockFilter = (
	value: string | undefined
): StockFilter | undefined => (value === 'out' ? value : undefined);

type StockedProduct = {
	quantity: number | null;
	// a product with options is stocked per option
	variants?: { quantity: number }[] | null;
};

// The status of a whole product. Without options it's just its own stock. With
// options: sold out only when every option is sold out, and low when any option
// is low or sold out (so a product with one option left to reorder gets flagged).
export const getProductStockStatus = (product: StockedProduct): StockStatus => {
	const variants = product.variants ?? [];
	if (variants.length === 0) return getStockStatus(product.quantity);
	const statuses = variants.map((variant) => getStockStatus(variant.quantity));
	if (statuses.every((status) => status === 'sold-out')) return 'sold-out';
	if (statuses.some((status) => status === 'sold-out' || status === 'low')) {
		return 'low';
	}
	return 'ok';
};

export const matchesStockFilter = (product: StockedProduct) =>
	getProductStockStatus(product) === 'sold-out';

// How many products are sold out. The products page and the dashboard both
// use this, so their numbers always agree.
export const countStock = (products: StockedProduct[]) => ({
	all: products.length,
	out: products.filter((p) => getProductStockStatus(p) === 'sold-out').length,
});
