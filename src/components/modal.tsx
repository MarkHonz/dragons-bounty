'use client';

import { Dialog, DialogOverlay, DialogContent } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

type ModalProps = {
	children: React.ReactNode;
};

export default function Modal({ children }: ModalProps) {
	const router = useRouter();

	const handleOpenChange = () => {
		router.back();
	};

	return (
		<Dialog defaultOpen={true} open={true} onOpenChange={handleOpenChange}>
			<DialogOverlay>
				<DialogContent className="overflow-y-hidden">{children}</DialogContent>
			</DialogOverlay>
		</Dialog>
	);
}
