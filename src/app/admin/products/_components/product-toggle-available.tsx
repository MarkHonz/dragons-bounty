'use client';

import { toggleAvailable } from '@/actions/product-actions';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';

type ProductToggleAvailableProps = {
	product: { id: string; isActive: boolean };
};

export default function ProductToggleAvailable({
	product,
}: ProductToggleAvailableProps) {
	const router = useRouter();

	return (
		<DropdownMenuItem
			onClick={async () => {
				await toggleAvailable(product.id, !product.isActive);
				router.refresh();
			}}
		>
			{product.isActive ? 'Deactivate' : 'Activate'}
		</DropdownMenuItem>
	);
}
