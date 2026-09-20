'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { toggleFeatured } from '@/actions/product-actions';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

type ProductToggleFeaturedProps = {
	product: { id: string; isFeatured: boolean };
};

export default function ProductToggleFeatured({
	product,
}: ProductToggleFeaturedProps) {
	const router = useRouter();

	return (
		<DropdownMenuItem
			onClick={async () => {
				const result = await toggleFeatured(product.id, !product.isFeatured);
				if (!result.success) {
					toast.error(result.errors.join(' '));
				}
				router.refresh();
			}}
		>
			{product.isFeatured ? 'Remove from featured' : 'Feature on homepage'}
		</DropdownMenuItem>
	);
}
