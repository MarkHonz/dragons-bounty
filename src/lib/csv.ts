// Building CSV files for a spreadsheet. Two things matter beyond commas:
//  - a field with a comma, quote or line break has to be quoted, with its own
//    quotes doubled
//  - Excel and Sheets run a cell that starts with = + - or @ as a formula, and
//    customers choose their own names and addresses, so such text gets a leading
//    apostrophe (shown as plain text)

export type CsvValue = string | number | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

export const csvField = (value: CsvValue): string => {
	if (value === null || value === undefined) return '';
	// numbers are ours (never typed by a customer), so they are left alone
	if (typeof value === 'number') return String(value);
	const text = FORMULA_START.test(value) ? `'${value}` : value;
	return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// A byte-order mark first, so Excel reads accented names as UTF-8. Lines end in
// CRLF as the CSV standard says.
export const toCsv = (headers: string[], rows: CsvValue[][]): string =>
	'﻿' +
	[headers, ...rows].map((row) => row.map(csvField).join(',')).join('\r\n') +
	'\r\n';

// whole cents as plain dollars for a spreadsheet: 3201 -> "32.01"
export const dollars = (cents: number | null | undefined): string =>
	((cents ?? 0) / 100).toFixed(2);

export type ExportOrderRow = {
	id: string;
	createdAt: Date;
	status: string;
	customerName: string | null;
	customerEmail: string;
	shipToName: string | null;
	shipToAddress1: string | null;
	shipToAddress2: string | null;
	shipToCity: string | null;
	shipToState: string | null;
	shipToZip: string | null;
	// e.g. "2 x Blanket - Large; 1 x Dice"
	items: string;
	productTotalInCents: number;
	discountCode: string | null;
	discountInCents: number;
	shippingTotalInCents: number | null;
	taxTotalInCents: number | null;
	totalInCents: number;
	refundedAmountInCents: number | null;
	// who ships it, e.g. "Dragon's Bounty; Moonstone Ceramics"
	sellers: string;
	// one package: its number; several: "Moonstone Ceramics: 9400...; ..."
	trackingNumber: string | null;
	stripePaymentIntentId: string | null;
};

export const ORDER_CSV_HEADERS = [
	'Order ID',
	'Date',
	'Status',
	'Customer name',
	'Customer email',
	'Ship to name',
	'Address 1',
	'Address 2',
	'City',
	'State',
	'Zip',
	'Items',
	'Items total',
	'Discount code',
	'Discount',
	'Shipping',
	'Tax',
	'Total',
	'Refunded',
	'Sellers',
	'Tracking number',
	'Stripe payment ID',
];

export const ordersToCsv = (orders: ExportOrderRow[]): string =>
	toCsv(
		ORDER_CSV_HEADERS,
		orders.map((order) => [
			order.id,
			order.createdAt.toISOString(),
			order.status,
			order.customerName,
			order.customerEmail,
			order.shipToName,
			order.shipToAddress1,
			order.shipToAddress2,
			order.shipToCity,
			order.shipToState,
			order.shipToZip,
			order.items,
			dollars(order.productTotalInCents),
			order.discountCode,
			dollars(order.discountInCents),
			dollars(order.shippingTotalInCents),
			dollars(order.taxTotalInCents),
			dollars(order.totalInCents),
			dollars(order.refundedAmountInCents),
			order.sellers,
			order.trackingNumber,
			order.stripePaymentIntentId,
		])
	);
