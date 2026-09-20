'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { moveCategoryAction } from '@/actions/category-actions';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

type CategoryMoveProps = {
	category: { id: string; position: number; total: number };
};

// "Move up" / "Move down" menu items for the storefront order. `position` is
// 1-based and counts every category, inactive ones included.
export default function CategoryMove({ category }: CategoryMoveProps) {
	const router = useRouter();

	const move = async (direction: 'up' | 'down') => {
		try {
			const result = await moveCategoryAction(category.id, direction);
			if (!result.success) {
				toast.error(result.errors.join(' '));
			}
		} catch (error) {
			console.error('Failed to move category', error);
			toast.error('Failed to move the category.');
		}
		router.refresh();
	};

	return (
		<>
			<DropdownMenuItem
				disabled={category.position <= 1}
				onClick={() => move('up')}
			>
				Move up
			</DropdownMenuItem>
			<DropdownMenuItem
				disabled={category.position >= category.total}
				onClick={() => move('down')}
			>
				Move down
			</DropdownMenuItem>
		</>
	);
}
