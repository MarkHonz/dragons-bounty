import ShippingRatesForm from '@/components/forms/shipping-rates-form';
import { getShippingRates } from '@/db/discount-db';

export default async function ShippingPage() {
	const rates = await getShippingRates();
	return (
		<main className="mx-auto max-w-md">
			<ShippingRatesForm
				flatRateInCents={rates.flatRateInCents}
				freeOverInCents={rates.freeOverInCents}
			/>
		</main>
	);
}
