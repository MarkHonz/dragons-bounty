import { Nav, NavLink } from '@/components/nav';

type Props = {
	children: React.ReactNode;
};

export default function AdminLayout({ children }: Props) {
	return (
		<>
			<Nav>
				<NavLink href="/admin">Dashboard</NavLink>
				<NavLink href="/admin/products">Products</NavLink>
				<NavLink href="/admin/category">Categories</NavLink>
				<NavLink href="/admin/users">Customers</NavLink>
				<NavLink href="/admin/orders">Sales</NavLink>
			</Nav>
			<div className="container my-6 ">{children}</div>
		</>
	);
}
