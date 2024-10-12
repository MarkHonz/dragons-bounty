import type { Metadata } from 'next';
// import localFont from 'next/font/local';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';

import MainHeader from '@/components/main-header';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

// const geistSans = localFont({
// 	src: '../fonts/GeistVF.woff',
// 	variable: '--font-geist-sans',
// 	weight: '100 900',
// });
// const geistMono = localFont({
// 	src: '../fonts/GeistMonoVF.woff',
// 	variable: '--font-geist-mono',
// 	weight: '100 900',
// });

export const metadata: Metadata = {
	title: "Dragon's Bounty",
	description: 'Crafting the best gear in the game',
};

export default function RootLayout({
	children,
	modal,
}: Readonly<{
	children: React.ReactNode;
	modal?: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={cn(
					'bg-background min-h-screen font-sans antialiased',
					inter.variable
				)}
			>
				{modal}
				<MainHeader />
				{children}
			</body>
		</html>
	);
}
