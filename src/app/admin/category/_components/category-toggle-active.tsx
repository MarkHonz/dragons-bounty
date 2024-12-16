'use client';

import { toggleCategoryActive } from '@/actions/category-actions';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';

type CategoryToggleActiveProps = {
	category: { id: string; isActive: boolean };
};

export default function CategoryToggleActive({
	category,
}: CategoryToggleActiveProps) {
	const router = useRouter();

	return (
		<DropdownMenuItem
			onClick={async () => {
				await toggleCategoryActive(category.id, !category.isActive);
				router.refresh();
			}}
		>
			{category.isActive ? 'Deactivate' : 'Activate'}
		</DropdownMenuItem>
	);
}
