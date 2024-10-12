'use client';

import { useRef } from 'react';

type Props = {
	children: React.ReactNode;
	prompt: string;
};

export default function DialogLauncher({ children, prompt }: Props) {
	const dialogRef = useRef<HTMLDialogElement>(null); // Create a reference to the dialog element

	const toggleDialog = () => {
		// If the dialog reference is null then return
		if (!dialogRef.current) {
			return;
		}
		// Check if the dialog is open or not and then show or close it
		dialogRef.current.hasAttribute('open')
			? dialogRef.current.close()
			: dialogRef.current.show();
	};

	return (
		<>
			<button onClick={toggleDialog}>{prompt}</button>

			<dialog ref={dialogRef}>
				{children}
				<button onClick={toggleDialog}>Cancel</button>
			</dialog>
		</>
	);
}
