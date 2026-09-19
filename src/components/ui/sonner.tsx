'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
	const { resolvedTheme } = useTheme();

	return (
		<Sonner
			theme={(resolvedTheme as ToasterProps['theme']) ?? 'system'}
			className="toaster group"
			style={{ fontFamily: 'var(--font-sans)' }}
			toastOptions={{
				classNames: {
					toast:
						'group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-warm-md',
					description: 'group-[.toast]:text-muted-foreground',
					actionButton: '!bg-primary !text-primary-foreground',
					cancelButton:
						'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
