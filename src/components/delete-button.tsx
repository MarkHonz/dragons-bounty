'use client';

import { userDelete } from '@/actions/user-actions';

type Props = {
	id: string;
};

export default function DeleteButton({ id }: Props) {
	return (
		<button
			key={id}
			onClick={() => {
				userDelete(id);
			}}
		>
			delete
		</button>
	);
}
