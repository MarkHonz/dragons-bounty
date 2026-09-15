'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function PurchaseSuccess() {
	useEffect(() => {
		// clear the local cart
		localStorage.setItem('cartItems', '[]');
	}, []);

	return (
		<div className="flex flex-col items-center gap-3 text-center">
			<CheckCircle className="h-12 w-12 text-secondary" />
			<h1 className="font-display text-3xl font-semibold">
				Payment Successful
			</h1>
			<p className="text-muted-foreground">Thank you for your purchase!</p>
			<Link href="/orders">
				<Button className="mt-2 rounded-full">View Your Orders</Button>
			</Link>
		</div>
	);
}
