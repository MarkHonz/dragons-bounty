'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PurchaseSuccess() {
	// clear the local cart
	localStorage.setItem('cartItems', '[]');
	return (
		<>
			<h1 className="text-3xl">Payment Successful</h1>
			<p>Thank you for your purchase!</p>
			<Link href="/orders">
				<Button>View Your Orders</Button>
			</Link>
		</>
	);
}
