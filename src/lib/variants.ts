// Shared rules for product options (variants). No database access here, so both
// server and browser code can use it.

export type VariantProps = {
	id: string;
	name: string;
	// null = use the product's own price
	priceInCents: number | null;
	quantity: number;
	position?: number;
};

// most products have no options; then everything works as it always has
export const hasVariants = (product: { variants?: unknown[] | null }) =>
	(product.variants?.length ?? 0) > 0;

// the price of one option: its own, or else the product's
export const variantPrice = (
	productPriceInCents: number,
	variant?: { priceInCents: number | null } | null
) => variant?.priceInCents ?? productPriceInCents;

// the lowest and highest price a shopper can pay for this product
export const getPriceRange = (product: {
	priceInCents: number;
	variants?: { priceInCents: number | null }[] | null;
}) => {
	const prices = hasVariants(product)
		? (product.variants ?? []).map((v) =>
				variantPrice(product.priceInCents, v)
			)
		: [product.priceInCents];
	return { min: Math.min(...prices), max: Math.max(...prices) };
};

// "Blanket — Large", or just "Blanket" when the product has no options
export const formatVariantLabel = (productName: string, variantName?: string) =>
	variantName ? `${productName} — ${variantName}` : productName;

export const MAX_VARIANTS = 20;
export const MAX_VARIANT_NAME_LENGTH = 60;
