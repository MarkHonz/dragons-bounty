import MainHeader from '@/components/main-header';
import MainFooter from '@/components/main-footer';

export default function ShopLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<>
			<MainHeader />
			{children}
			<MainFooter />
		</>
	);
}
