'use server';

import { revalidatePath } from 'next/cache';

import { logActivity } from '@/db/activity-db';
import {
	MAX_ARTIST_NAME_LENGTH,
	MIN_ARTIST_NAME_LENGTH,
	setArtistStatus,
} from '@/db/artist-db';
import db from '@/db/db';
import { shipPackage, unshipPackage } from '@/db/shipment-db';
import { getUserById } from '@/db/user-db';
import { assertAdminOrThrow, verifyAuthSession } from '@/lib/auth';
import { sendArtistStatusEmail, sendShippingUpdateEmail } from '@/lib/notifications';
import { checkTrackingNumber } from '@/lib/tracking';
import { formatVariantLabel } from '@/lib/variants';

type ActionResult = { ok: boolean; message: string };

const shortId = (orderId: string) => `#${orderId.slice(-8)}`;

const sellerLabel = async (sellerId: string) => {
	if (!sellerId) return 'the shop';
	const artist = await db.user.findUnique({
		where: { id: sellerId },
		select: { artistName: true },
	});
	return artist?.artistName ?? 'an artist';
};

const refreshOrderPages = (orderId: string, sellerId: string) => {
	revalidatePath('/admin/orders');
	revalidatePath(`/admin/orders/${orderId}`);
	revalidatePath('/orders');
	revalidatePath(`/orders/${orderId}`);
	if (sellerId) revalidatePath(`/artist/${sellerId}`);
};

// Mark one seller's package in an order as shipped, or correct its tracking
// number. An artist may only act on their own package; an admin on any.
// Everything is re-checked here, whatever the page showed.
export const shipPackageAction = async (
	orderId: string,
	sellerId: string,
	trackingNumber: string
): Promise<ActionResult> => {
	const { user } = await verifyAuthSession();
	if (!user) return { ok: false, message: 'Please sign in again.' };
	if (typeof orderId !== 'string' || typeof sellerId !== 'string') {
		return { ok: false, message: 'Order not found.' };
	}
	const isAdmin = user.role === 'ADMIN';
	const isThatArtist = user.isArtist && sellerId !== '' && sellerId === user.id;
	if (!isAdmin && !isThatArtist) return { ok: false, message: 'Order not found.' };

	const tracking = checkTrackingNumber(trackingNumber);
	if (!tracking.ok) return { ok: false, message: tracking.error };

	let result;
	try {
		result = await shipPackage({
			orderId,
			sellerId,
			trackingNumber: tracking.value,
			actorId: user.id,
		});
	} catch (error) {
		console.error('Failed to mark a package shipped', error);
		return { ok: false, message: "Couldn't save that. Please try again." };
	}

	if (result.status === 'not-found') return { ok: false, message: 'Order not found.' };
	if (result.status === 'refunded') {
		return { ok: false, message: 'This order was refunded. Please do not ship it.' };
	}
	if (result.status === 'unchanged') {
		return { ok: true, message: 'That tracking number is already saved.' };
	}

	const whose = await sellerLabel(sellerId);
	const label = shortId(orderId);
	if (result.status === 'updated') {
		await logActivity(
			user.id,
			'ORDER',
			`Corrected the tracking number for ${whose}'s package on order ${label} to ${tracking.value}`,
			orderId
		);
		refreshOrderPages(orderId, sellerId);
		return { ok: true, message: 'Tracking number updated.' };
	}

	await logActivity(
		user.id,
		'ORDER',
		`Marked ${whose}'s package on order ${label} as shipped (tracking ${tracking.value})`,
		orderId
	);

	// tell the customer about this package. After the change is saved, and a
	// failure here never undoes it.
	try {
		const order = await db.order.findUnique({
			where: { id: orderId },
			select: {
				profile: {
					select: { name: true, user: { select: { email: true } } },
				},
				Order_Products: {
					where: { artistId: sellerId },
					select: {
						variantName: true,
						quantity: true,
						Product: { select: { name: true } },
					},
				},
			},
		});
		if (order) {
			await sendShippingUpdateEmail({
				name: order.profile.name ?? 'there',
				email: order.profile.user.email,
				orderId,
				trackingNumber: tracking.value,
				orderUrl: `${process.env.NEXT_PUBLIC_SERVER_URL}/orders/${orderId}`,
				items: order.Order_Products.map((line) => ({
					name: formatVariantLabel(line.Product.name, line.variantName),
					quantity: line.quantity,
				})),
				sellerName: sellerId ? whose : null,
				moreToCome: !result.orderFulfilled,
			});
		}
	} catch (error) {
		console.error('Failed to send shipping update email', error);
	}

	refreshOrderPages(orderId, sellerId);
	return { ok: true, message: 'Marked as shipped. The customer has been emailed.' };
};

// Admin only: take back a "shipped" (for example, one marked by mistake).
export const unshipPackageAction = async (
	orderId: string,
	sellerId: string
): Promise<ActionResult> => {
	const { user: admin } = await assertAdminOrThrow();
	if (typeof orderId !== 'string' || typeof sellerId !== 'string') {
		return { ok: false, message: 'Order not found.' };
	}
	let removed;
	try {
		removed = await unshipPackage(orderId, sellerId);
	} catch (error) {
		console.error('Failed to undo a shipment', error);
		return { ok: false, message: "Couldn't save that. Please try again." };
	}
	if (!removed) return { ok: false, message: 'That package is not marked as shipped.' };
	await logActivity(
		admin.id,
		'ORDER',
		`Marked ${await sellerLabel(sellerId)}'s package on order ${shortId(orderId)} as not shipped`,
		orderId
	);
	refreshOrderPages(orderId, sellerId);
	return { ok: true, message: 'Marked as not shipped.' };
};

// Admin only: make someone an artist (or rename one), or remove the status.
export const setArtistStatusAction = async (
	userId: string,
	makeArtist: boolean,
	artistName?: string
): Promise<ActionResult> => {
	const { user: admin } = await assertAdminOrThrow();
	// a replayed request could send anything here: only a real true makes an artist
	const isArtist = makeArtist === true;
	if (typeof userId !== 'string' || !userId) {
		return { ok: false, message: 'Customer not found.' };
	}

	let name = '';
	if (isArtist) {
		name = typeof artistName === 'string' ? artistName.trim().replace(/\s+/g, ' ') : '';
		if (name.length < MIN_ARTIST_NAME_LENGTH || name.length > MAX_ARTIST_NAME_LENGTH) {
			return {
				ok: false,
				message: `The artist name must be ${MIN_ARTIST_NAME_LENGTH} to ${MAX_ARTIST_NAME_LENGTH} characters.`,
			};
		}
	}

	const before = await getUserById(userId);
	if (!before) return { ok: false, message: 'Customer not found.' };

	let result;
	try {
		result = await setArtistStatus(
			userId,
			isArtist ? { isArtist: true, artistName: name } : { isArtist: false }
		);
	} catch (error) {
		console.error('Failed to change artist status', error);
		return { ok: false, message: "Couldn't save that. Please try again." };
	}

	if (result === 'not-found') return { ok: false, message: 'Customer not found.' };
	if (result === 'unverified') {
		return {
			ok: false,
			message: "This account's email address isn't verified, so it can't be made an artist.",
		};
	}
	if (result === 'name-taken') {
		return { ok: false, message: 'Another artist already uses that name.' };
	}
	if (result === 'unchanged') return { ok: true, message: 'Nothing to change.' };

	const who = before.profile?.name ? `${before.profile.name} (${before.email})` : before.email;
	const renamed = isArtist && before.isArtist;
	await logActivity(
		admin.id,
		'CUSTOMER',
		!isArtist
			? `Removed artist status from ${who}`
			: renamed
				? `Renamed the artist ${who} from "${before.artistName ?? ''}" to "${name}"`
				: `Made ${who} an artist ("${name}")`
	);

	// a rename isn't worth an email; becoming (or no longer being) an artist is
	if (!renamed) {
		try {
			await sendArtistStatusEmail({
				email: before.email,
				name: before.profile?.name ?? 'there',
				added: isArtist,
				artistName: name,
				artistPageUrl: `${process.env.NEXT_PUBLIC_SERVER_URL}/artist/${userId}`,
			});
		} catch (error) {
			console.error('Failed to send artist status email', error);
		}
	}

	revalidatePath('/admin/customers', 'layout');
	revalidatePath('/admin/products');
	revalidatePath('/', 'layout');
	return {
		ok: true,
		message: !isArtist
			? 'Artist status removed.'
			: renamed
				? 'Artist name updated.'
				: 'They are now an artist.',
	};
};
