'use client';

import { productDelete } from '@/actions/product-actions';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';

type Props = {
	id: string;
	imagePath?: string | null;
};

export default function ProductDelete({ id, imagePath }: Props) {
	const router = useRouter();
	return (
		<>
			<DropdownMenuItem
				onClick={() => {
					productDelete(id, imagePath ?? '');
					router.refresh();
				}}
				className="text-red-500"
			>
				Delete
			</DropdownMenuItem>
		</>
	);
}
