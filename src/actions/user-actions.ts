'use server';

import z from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
	addUserAddress,
	changeUserRole,
	createUser,
	createVerificationToken,
	deleteUser,
	findUserByEmail,
	findUserByEmailIgnoringCase,
	getOtherAdmins,
	getUserById,
	updateUserProfile,
} from '@/db/user-db';
import { hashUserPassword, verifyPassword } from '@/lib/hash';
import { checkProfile, cleanProfile, isAddressBlank } from '@/lib/profile-rules';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/lib/password-rules';
import {
	assertAdminOrThrow,
	createAuthSession,
	destroyAuthSession,
	verifyAuthSession,
} from '@/lib/auth';
import { addItemToCart, getCartById, getCartIdByUserId } from '@/db/cart-db';
import { getPurchasableQuantity, getPurchaseInfo } from '@/db/product-db';
import {
	sendAdminAddedNoticeEmail,
	sendRoleChangeEmail,
	sendSignInBlockedEmail,
	sendVerificationEmail,
} from '@/lib/notifications';
import { beginAttempt, clearAttempts } from '@/db/auth-attempts-db';
import { normalizeSubject, signInBlockedMessage } from '@/lib/attempt-limits';
import { getClientIp } from '@/lib/client-ip';
import { stripe } from '@/lib/stripe';
import { logActivity } from '@/db/activity-db';

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

// Signing in gives the same answer for an unknown email and a wrong password, so
// it can't be used to find out who has an account. A hash to check against when
// there is no such account keeps the two cases equally slow.
const SIGN_IN_FAILED = 'Incorrect email or password';
const NO_ACCOUNT_HASH = hashUserPassword('no account has this password');

export const userSubmit = async (previousState: object, formData: FormData) => {
	const name = formData.get('name') as string | null;
	const password = formData.get('password') as string | null;
	const email = formData.get('email') as string | null;
	interface CartItem {
		productId: string;
		// the chosen option; missing or "" for a product without options
		variantId?: string;
		quantity: number;
	}

	const cartItems = formData.get('cartItems') as CartItem[] | null;
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// Create a schema for the form data
	const schema = z.object({
		name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
		password: z
			.string()
			.min(MIN_PASSWORD_LENGTH, {
				message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
			})
			.max(MAX_PASSWORD_LENGTH, {
				message: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer`,
			}),
		email: z.string().email(),
		cartItems: z.string().optional(),
	});

	try {
		// Validate the form data
		schema.parse({
			name,
			password,
			email,
			cartItems,
		});
	} catch (error) {
		const { errors } = error as z.ZodError;
		// console.log('error:', error.errors[0].message);
		console.log('errors:', errors);
		errors.map((error) => {
			response.errors.push(error.message);
		});
		return response;
	}

	// Check if the name, email, and password are strings
	if (
		typeof name !== 'string' ||
		typeof email !== 'string' ||
		typeof password !== 'string'
	) {
		response.errors.push('Invalid form data');
		return response;
	}
	const hashedPassword = hashUserPassword(password);

	const parsedCartItems = cartItems
		? JSON.parse(cartItems as unknown as string)
		: null;

	// Create the user
	const user = (await createUser({
		name,
		email,
		password: hashedPassword,
	})) as { id: string }; // Add type assertion here
	await createAuthSession(user.id); // Create a session for the user

	// send a verification email; failures here must never block signup
	try {
		const token = await createVerificationToken(
			user.id,
			'EMAIL_VERIFY',
			new Date(Date.now() + ONE_DAY_MS)
		);
		await sendVerificationEmail({
			name,
			email,
			verifyUrl: `${process.env.NEXT_PUBLIC_SERVER_URL}/verify-email?token=${token}`,
		});
	} catch (error) {
		console.error('Failed to send verification email', error);
	}

	console.log('cartItems:', cartItems);

	// add the cartItems to the cart in the database table cart_product
	if (parsedCartItems !== null && parsedCartItems.length > 0) {
		const cartId: string = (await getCartIdByUserId(user.id)) as string;
		// json parse the cartItems and add each item to the cart

		await Promise.all(
			parsedCartItems.map(async (item: CartItem) => {
				const productId = item['productId'] as string;
				// the browser's copy is untrusted: an option that doesn't fit the
				// product simply counts as not buyable below
				const variantId =
					typeof item.variantId === 'string' ? item.variantId : '';
				const wanted = parseInt(item['quantity'] as unknown as string, 10) || 1;
				// a guest cart may hold more than is in stock now; keep what can be bought
				const quantity = await getPurchasableQuantity(
					productId,
					variantId,
					wanted
				);
				if (quantity < 1) return;
				await addItemToCart({
					cartId,
					productId,
					variantId,
					quantity,
				});
			})
		);
	}

	// redirect('/'); // Redirect to the home page
	response.success = true; // Set the success flag to true
	console.log('SUCCESS!');
	revalidatePath('/', 'layout'); // Revalidate the layout path
	return response; // Return the response object
};

type CartItem = {
	productId?: string;
	// the chosen option; missing or "" for a product without options
	variantId?: string;
	quantity?: number;
	name?: string;
	price?: number;
};

// Tell an account's owner that sign-in for it was paused. Never throws: it runs
// in the background of a refused sign-in.
const notifySignInBlocked = async (typedEmail: string) => {
	try {
		// the address may have been typed in different capitals from how it was saved
		const user = await findUserByEmailIgnoringCase(normalizeSubject(typedEmail));
		if (!user) return;
		const full = await getUserById(user.id);
		await sendSignInBlockedEmail({
			name: full?.profile?.name ?? 'there',
			email: user.email,
			forgotPasswordUrl: `${process.env.NEXT_PUBLIC_SERVER_URL}/forgot-password`,
		});
	} catch (error) {
		console.error('Failed to send the sign-in paused email', error);
	}
};

export const userLogin = async (previousState: object, formData: FormData) => {
	const email = formData.get('email') as string | null;
	const password = formData.get('password') as string | null;
	const sentCartItems = formData.get('cartItems') as CartItem[] | null;
	const response: {
		errors: string[];
		success: boolean;
		cartItems: CartItem[];
	} = {
		errors: [],
		success: false,
		cartItems: [],
	};

	// Create a schema for the form data
	const schema = z.object({
		// capped, because the email typed is remembered for a day to slow guessing
		// down, and nobody's address is longer than this
		email: z.string().email().max(254),
		// no account has a longer password than this (sign-up caps it at 128)
		password: z.string().min(6).max(1024),
		sentCartItems: z.string().optional(),
	});

	try {
		// Validate the form data
		schema.parse({
			email,
			password,
			sentCartItems,
		});
	} catch (error) {
		const { errors } = error as z.ZodError;
		errors.map((error) => {
			response.errors.push(error.message);
		});
		return response;
	}

	if (email == null) {
		response.errors.push('Email is required');
		return response;
	}

	// Slow down guessing: after a few wrong passwords sign-in is paused for a
	// while. This comes before any password checking, so it is cheap to refuse a
	// flood, and unknown emails are limited in exactly the same way as real ones.
	const subject = normalizeSubject(email);
	let attempt;
	try {
		attempt = await beginAttempt('SIGN_IN', subject, getClientIp());
	} catch (error) {
		// if the limit can't be checked, nobody is let in without it
		console.error('Failed to check the sign-in limit', error);
		response.errors.push(
			'Sign-in is unavailable for a moment. Please try again.'
		);
		return response;
	}
	if (!attempt.allowed) {
		if (attempt.notifyOwner) {
			// not awaited: whether an email is sent must not change how long the
			// answer takes, or it would give away which accounts exist
			void notifySignInBlocked(email);
		}
		response.errors.push(signInBlockedMessage(attempt.retryAfterMs));
		return response;
	}

	const user = await findUserByEmail(email);
	if (user == null) {
		// spend the same time a real check would
		verifyPassword(NO_ACCOUNT_HASH, password as string);
		response.errors.push(SIGN_IN_FAILED);
		return response;
	}

	if (password === null) {
		response.errors.push('Password is required');
		return response;
	}
	const isValid = verifyPassword(user.password, password);
	if (isValid == false) {
		response.errors.push(SIGN_IN_FAILED);
		return response;
	}

	// the right password: the wrong guesses made before it no longer count
	await clearAttempts('SIGN_IN', subject);

	await createAuthSession(user.id); // Create a session for the user

	const localCartItems = JSON.parse(
		sentCartItems as unknown as string
	) as CartItem[];

	const cartId: string = (await getCartIdByUserId(user.id)) as string;

	//type for the cartItems in the database
	type DatabaseCartItem = {
		product_id: string;
		variant_id: string;
		quantity: number;
		cart_id: string;
	};

	// get the cartItems from the database
	const databaseCartItems = (await getCartById(cartId)) as DatabaseCartItem[];

	console.log('localCartItems:', localCartItems);
	console.log('databaseCartItems:', databaseCartItems);

	// map over the localCartItems and add them to the databaseCartItems if they don't already exist
	await Promise.all(
		localCartItems.map(async (localCartItem) => {
			if (localCartItem.productId) {
				const variantId =
					typeof localCartItem.variantId === 'string'
						? localCartItem.variantId
						: '';
				const itemExists = databaseCartItems.find(
					(databaseCartItem) =>
						databaseCartItem.product_id === localCartItem.productId &&
						databaseCartItem.variant_id === variantId
				);
				if (itemExists === undefined) {
					const wanted =
						parseInt(localCartItem.quantity as unknown as string, 10) || 1;
					// keep only what can be bought; skip sold-out items
					const quantity = await getPurchasableQuantity(
						localCartItem.productId,
						variantId,
						wanted
					);
					if (quantity > 0) {
						await addItemToCart({
							cartId: cartId,
							productId: localCartItem.productId,
							variantId,
							quantity,
						});
					}
				}
			}
		})
	);

	// map over the databaseCartItems and add items to the response object if they don't already exist
	await Promise.all(
		databaseCartItems.map(async (databaseCartItem) => {
			const itemExists = localCartItems.find(
				(localCartItem) =>
					localCartItem.productId === databaseCartItem.product_id &&
					(localCartItem.variantId ?? '') === databaseCartItem.variant_id
			);
			// make sure the item exists and has a productId
			if (itemExists === undefined) {
				// get product info from the database and add it to the response object
				if (databaseCartItem.product_id) {
					const info = await getPurchaseInfo(
						databaseCartItem.product_id,
						databaseCartItem.variant_id
					);
					response.cartItems.push({
						productId: databaseCartItem.product_id,
						variantId: databaseCartItem.variant_id,
						quantity: databaseCartItem.quantity,
						name: info?.productName,
						price: info?.priceInCents,
					});
				}
			}
		})
	);

	// redirect('/'); // Redirect to the home page
	response.success = true; // Set the success flag to true
	return response; // Return the response object
};

// Admin: change a customer's role from their detail page. Every rule is checked
// here on the server; the buttons on the page only mirror them.
export const setUserRoleAction = async (userId: string, role: string) => {
	const { user: admin } = await assertAdminOrThrow();

	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	if (role !== 'ADMIN' && role !== 'USER') {
		response.errors.push('Invalid role.');
		return response;
	}
	if (typeof userId !== 'string' || !userId) {
		response.errors.push('Customer not found.');
		return response;
	}
	// nobody changes their own role: it can't lock you out, and stepping down
	// (or up) is another admin's decision
	if (admin.id === userId) {
		response.errors.push("You can't change your own role. Ask another admin.");
		return response;
	}

	let result;
	try {
		result = await changeUserRole(userId, role, admin.id);
	} catch (error) {
		console.error('Failed to change role', error);
		response.errors.push('Failed to change the role. Please try again.');
		return response;
	}

	if (result === 'not-found') {
		response.errors.push('Customer not found.');
		return response;
	}
	if (result === 'unverified') {
		response.errors.push(
			"This account's email address isn't verified, so it can't be made an admin."
		);
		return response;
	}
	if (result === 'last-admin') {
		response.errors.push(
			"This is the last admin, so admin access can't be removed."
		);
		return response;
	}

	if (result === 'changed') {
		console.log(`[admin] ${admin.id} set the role of ${userId} to ${role}`);
		const changed = await getUserById(userId);
		const who = changed?.profile?.name
			? `${changed.profile.name} (${changed.email})`
			: (changed?.email ?? userId);
		await logActivity(
			admin.id,
			'CUSTOMER',
			role === 'ADMIN'
				? `Made ${who} an admin`
				: `Removed admin access from ${who}`
		);

		// tell the person concerned. This happens after the change has been saved
		// and recorded, and a failure here never undoes either.
		try {
			const [target, actor] = await Promise.all([
				getUserById(userId),
				getUserById(admin.id),
			]);
			if (target) {
				await sendRoleChangeEmail({
					name: target.profile?.name ?? 'there',
					email: target.email,
					promoted: role === 'ADMIN',
					changedBy: actor?.profile?.name || actor?.email || 'An admin',
					adminUrl: `${process.env.NEXT_PUBLIC_SERVER_URL}/admin`,
				});
			}
		} catch (error) {
			console.error('Failed to send role change email', error);
		}

		// When someone is made an admin, the other admins hear about it too: not the
		// person who did it (they know) nor the new admin (told above). Each gets
		// their own email, so no one sees the others' addresses, and one failing
		// never stops the rest or undoes the change.
		if (role === 'ADMIN') {
			try {
				const [target, actor] = await Promise.all([
					getUserById(userId),
					getUserById(admin.id),
				]);
				const others = await getOtherAdmins([admin.id, userId]);
				for (const other of others) {
					try {
						await sendAdminAddedNoticeEmail({
							name: other.name ?? 'there',
							email: other.email,
							newAdmin: target?.profile?.name || target?.email || 'Someone',
							changedBy: actor?.profile?.name || actor?.email || 'An admin',
							roleHistoryUrl: `${process.env.NEXT_PUBLIC_SERVER_URL}/admin/customers/role-history`,
						});
					} catch (error) {
						console.error('Failed to send admin notice email', error);
					}
				}
			} catch (error) {
				console.error('Failed to notify the other admins', error);
			}
		}
	}
	revalidatePath('/admin/customers', 'layout');
	response.success = true;
	return response;
};

// Admin: delete a customer from their detail page.
export const userDeleteAction = async (userId: string) => {
	const { user: admin } = await assertAdminOrThrow();

	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	if (typeof userId !== 'string' || !userId) {
		response.errors.push('Customer not found.');
		return response;
	}
	if (admin.id === userId) {
		response.errors.push("You can't delete your own account.");
		return response;
	}

	const target = await getUserById(userId);
	if (!target) {
		response.errors.push('Customer not found.');
		return response;
	}
	if (target.role === 'ADMIN') {
		response.errors.push(
			"Admins can't be deleted. Remove their admin access first."
		);
		return response;
	}

	try {
		await deleteUser(userId);
	} catch (error) {
		// P2003: they have orders, and the shop keeps its order history
		if ((error as { code?: string }).code === 'P2003') {
			response.errors.push(
				"This customer has orders, so they can't be deleted. Their order history has to stay."
			);
		} else {
			console.error('Failed to delete user', error);
			response.errors.push('Failed to delete the customer. Please try again.');
		}
		return response;
	}

	console.log(`[admin] ${admin.id} deleted the customer ${userId}`);
	await logActivity(
		admin.id,
		'CUSTOMER',
		`Deleted the customer ${
			target.profile?.name ? `${target.profile.name} (${target.email})` : target.email
		}`
	);
	revalidatePath('/admin/customers', 'layout');
	response.success = true;
	return response;
};

export const userLogout = async () => {
	await destroyAuthSession();
	redirect('/');
};

// Save the checkout shipping address to the signed-in user's profile and onto
// their payment, so the order later keeps the address that was actually used
// even if the profile changes.
export const userAddAddress = async (
	previousState: object,
	formData: FormData
) => {
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// who is asking comes from the session, never from the form
	const { user } = await verifyAuthSession();
	if (user == null) {
		response.errors.push('You must be signed in to add an address');
		return response;
	}

	const schema = z.object({
		address1: z.string().min(2, { message: 'Address is required' }),
		address2: z.string().optional(),
		city: z.string().min(2, { message: 'City is required' }),
		state: z.string().min(2, { message: 'State is required' }),
		zip: z.string().min(5, { message: 'Zip is required' }),
		paymentIntentId: z
			.string()
			.startsWith('pi_', { message: 'Invalid payment' }),
	});

	const parsed = schema.safeParse({
		address1: formData.get('address1'),
		address2: formData.get('address2') ?? undefined,
		city: formData.get('city'),
		state: formData.get('state'),
		zip: formData.get('zip'),
		paymentIntentId: formData.get('paymentIntentId'),
	});
	if (!parsed.success) {
		parsed.error.errors.forEach((error) => response.errors.push(error.message));
		return response;
	}
	const { address1, address2 = '', city, state, zip, paymentIntentId } =
		parsed.data;

	// the payment must belong to this customer and still be open
	let paymentIntent;
	try {
		paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
	} catch {
		response.errors.push('Could not find this payment. Please reload the page.');
		return response;
	}
	const stillOpen = [
		'requires_payment_method',
		'requires_confirmation',
		'requires_action',
	].includes(paymentIntent.status);
	if (paymentIntent.metadata.user_id !== user.id || !stillOpen) {
		response.errors.push(
			'This checkout can no longer be changed. Please reload the page.'
		);
		return response;
	}

	// add the address to the user profile (addUserAddress returns errors
	// rather than throwing them)
	const saved = await addUserAddress(user.id, address1, address2, city, state, zip);
	if (saved instanceof Error) {
		response.errors.push('Error adding address');
		return response;
	}

	// attach it to the payment; the Stripe webhook copies it onto the order
	const account = await getUserById(user.id);
	try {
		await stripe.paymentIntents.update(paymentIntentId, {
			shipping: {
				name: account?.profile?.name || account?.email || 'Customer',
				address: {
					line1: address1,
					line2: address2,
					city,
					state,
					postal_code: zip,
				},
			},
		});
	} catch (error) {
		console.error('Failed to attach shipping address to payment', error);
		response.errors.push(
			'Could not save your shipping details. Please try again.'
		);
		return response;
	}

	response.success = true;
	revalidatePath('/', 'layout');
	return response;
};

// update the signed-in user's own profile/address
export const userUpdateProfile = async (
	previousState: object,
	formData: FormData
) => {
	const response: { errors: string[]; success: boolean } = {
		errors: [],
		success: false,
	};

	// The name is required; the address is optional but all or nothing (leaving it
	// blank clears any saved address). See profile-rules.
	const details = cleanProfile({
		name: formData.get('name'),
		address1: formData.get('address1'),
		address2: formData.get('address2'),
		city: formData.get('city'),
		state: formData.get('state'),
		zip: formData.get('zip'),
	});
	const problems = checkProfile(details);
	if (problems.length > 0) {
		response.errors.push(...problems);
		return response;
	}
	const blank = isAddressBlank(details);
	const { name } = details;
	const address1 = blank ? null : details.address1;
	const address2 = blank ? null : details.address2 || null;
	const city = blank ? null : details.city;
	const state = blank ? null : details.state;
	const zip = blank ? null : details.zip;

	const { user } = await verifyAuthSession();
	if (user == null) {
		response.errors.push('You must be signed in to update your profile');
		return response;
	}

	try {
		await updateUserProfile({ id: user.id, name, address1, address2, city, state, zip });
		response.success = true;
		revalidatePath('/account', 'layout');
		return response;
	} catch {
		response.errors.push('Error updating profile');
		return response;
	}
};
