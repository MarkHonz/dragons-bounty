import type { Metadata } from 'next';
import { Cinzel, Nunito } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';

const cinzel = Cinzel({
	subsets: ['latin'],
	variable: '--font-display',
	weight: ['500', '600', '700'],
});
const nunito = Nunito({
	subsets: ['latin'],
	variable: '--font-sans',
	weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
	title: "Dragon's Bounty",
	description: 'Crafting the best gear in the game',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={cn(
					'bg-background min-h-screen font-sans antialiased',
					cinzel.variable,
					nunito.variable
				)}
			>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
					{children}
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}
