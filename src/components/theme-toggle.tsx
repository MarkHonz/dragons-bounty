'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export default function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme();
	// avoid rendering theme-dependent UI before the client has mounted, since
	// the resolved theme is unknown during server rendering
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	return (
		<Button
			variant="outline"
			size="icon"
			className="rounded-full"
			aria-label="Toggle theme"
			onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
		>
			{mounted && resolvedTheme === 'dark' ? (
				<Sun className="h-4 w-4" />
			) : (
				<Moon className="h-4 w-4" />
			)}
		</Button>
	);
}
