import { userLogout } from '@/actions/user-actions';
import Link from 'next/link';
import React from 'react';

export default function MainHeader() {
	return (
		<>
			<Link href="/sign-in?formMode=login">sign in</Link>
			<form action={userLogout}>
				<button>Logout</button>
			</form>
		</>
	);
}
