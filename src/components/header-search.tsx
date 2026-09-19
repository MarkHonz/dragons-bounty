'use client';

import { useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function HeaderSearch() {
	const [isOpen, setIsOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		if (!isOpen) {
			event.preventDefault();
			setIsOpen(true);
			requestAnimationFrame(() => inputRef.current?.focus());
		}
	};

	return (
		<form
			action="/search"
			method="GET"
			onSubmit={handleSubmit}
			className="flex items-center gap-2"
		>
			{isOpen && (
				<Input
					ref={inputRef}
					type="search"
					name="q"
					placeholder="Search..."
					className="h-10 w-40 rounded-full"
					onKeyDown={(event) => {
						if (event.key === 'Escape') {
							setIsOpen(false);
						}
					}}
				/>
			)}
			<Button
				type="submit"
				variant="outline"
				size="icon"
				className="rounded-full"
				aria-label="Search"
			>
				<Search className="h-4 w-4" />
			</Button>
		</form>
	);
}
