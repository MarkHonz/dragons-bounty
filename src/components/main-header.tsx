import { userLogout } from '@/actions/user-actions';
import Link from 'next/link';
import { BsCart } from 'react-icons/bs';

import { verifyAuthSession } from '@/lib/auth';
import { CartProps, getCartById, getCartIdByUserId } from '@/db/cart-db';

export default async function MainHeader() {
	// get the authenticated user
	const sessionUserId = await verifyAuthSession();
	let authenticatedUser = '';
	if (sessionUserId.user !== null) {
		authenticatedUser = sessionUserId.user.id;
	} else {
		authenticatedUser = 'guest';
	}
	// get the cartId from the userId
	let cartId: string | null = '';
	if (authenticatedUser !== 'guest') {
		cartId = (await getCartIdByUserId(authenticatedUser)) as string;
	} else {
		cartId = 'guest';
	}

	// get the cart items from database
	const cartItems = (await getCartById(cartId)) as CartProps[];

	// get the total quantity of items in the cart
	const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);

	return (
		<header className="flex flex-row gap-5 justify-between p-5 pb-10">
			<Link href="/">
				<h1 className="text-5xl">{"Dragon's Bounty"}</h1>
			</Link>
			<Link href="/sign-in">Sign In</Link>
			<form action={userLogout}>
				<button>Logout</button>
			</form>
			<div className="w-10 h-10 bg-gray-100 rounded-full flex justify-center items-center relative">
				<Link href="/cart">
					<BsCart size={25} color={'blue'} />
					<span className="absolute top-2/3 left-2/3 bg-red-500 text-white text-sm w-5 h-5 rounded-full flex justify-center items-center">
						{totalQuantity}
					</span>
				</Link>
			</div>
		</header>
	);
}
