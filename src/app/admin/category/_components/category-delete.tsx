'use client';

import { categoryDelete } from '@/actions/category-actions';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

type Props = {
	id: string;
};

export default function CategoryDelete({ id }: Props) {
	return (
		<>
			<DropdownMenuItem
				onClick={() => {
					categoryDelete(id);
				}}
				className="text-red-500"
			>
				Delete
			</DropdownMenuItem>
		</>
	);
}
