import db from '@/db/db';
import { generateVerificationToken } from '@/lib/tokens';

export type UserProps = {
	id: string;
	email: string;
	emailVerified: boolean;
	password?: string | null;
	profile: {
		id: string;
		name?: string | null;
		address1?: string | null;
		address2?: string | null;
		city?: string | null;
		state?: string | null;
		zip?: string | null;
		Cart: {
			id: string;
		};
	};
};

export type CreateUserProps = {
	name: string;
	email: string;
	password: string;
};

export type AddressType = {
	name: string;
	address1: string;
	address2: string;
	city: string;
	state: string;
	zip: string;
};

export const createUser = async ({
	email,
	password,
	name,
}: CreateUserProps) => {
	try {
		return await db.user.create({
			data: {
				email,
				password,
				profile: {
					create: {
						name: name,
						Cart: {
							create: {},
						},
					},
				},
			},
		});
	} catch (error) {
		// console.error(error);
		return error;
	}
};

type UpdateUserProfileProps = {
	id: string;
	name: string;
	address1: string;
	address2: string;
	city: string;
	state: string;
	zip: string;
};

export const updateUserProfile = async ({
	id,
	name,
	address1,
	address2,
	city,
	state,
	zip,
}: UpdateUserProfileProps) => {
	try {
		return await db.user.update({
			where: { id: id },
			data: {
				profile: {
					update: {
						name: name,
						address1: address1,
						address2: address2,
						city: city,
						state: state,
						zip: zip,
					},
				},
			},
		});
	} catch (error) {
		return error;
	}
};

export const getUsers = async () => {
	return await db.user.findMany({
		include: { profile: { include: { Cart: true } } },
	});
};

// Everything the admin customers table shows, and nothing more. This list is
// handed to a client component, so it must never include the password hash.
export type CustomerRow = {
	id: string;
	name: string | null;
	email: string;
	cartId: string | null;
};

export const getCustomers = async (): Promise<CustomerRow[]> => {
	const users = await db.user.findMany({
		select: {
			id: true,
			email: true,
			profile: { select: { name: true, Cart: { select: { id: true } } } },
		},
		orderBy: { createdAt: 'desc' },
	});

	return users.map((user) => ({
		id: user.id,
		name: user.profile?.name ?? null,
		email: user.email,
		cartId: user.profile?.Cart?.id ?? null,
	}));
};

export const deleteUser = async (id: string) => {
	return await db.user.delete({
		where: { id: id },
		include: { profile: { include: { Cart: {} } }, sessions: {} },
	});
};

export const findUserByEmail = async (email: string) => {
	return await db.user.findUnique({
		where: { email },
		include: { profile: {} },
	});
};

export const getUserById = async (id: string) => {
	return await db.user.findUnique({
		where: { id },
		include: {
			profile: {
				include: { Cart: {} },
			},
		},
	});
};

//get profile id by user id
export const getProfileIdByUserId = async (id: string) => {
	const user = await db.user.findUnique({
		where: { id },
		include: { profile: {} },
	});
	if (user && user.profile) {
		return user.profile.id;
	}
	return null;
};

// add address to profile
export const addUserAddress = async (
	id: string,
	address1: string,
	address2: string,
	city: string,
	state: string,
	zip: string
) => {
	try {
		return await db.user.update({
			where: { id: id },
			data: {
				profile: {
					update: {
						address1: address1,
						address2: address2,
						city: city,
						state: state,
						zip: zip,
					},
				},
			},
		});
	} catch (error) {
		return error;
	}
};

// get address by profile id
export const getAddressByProfileId = async (id: string) => {
	const profile = await db.profile.findUnique({
		where: { id },
	});
	if (profile) {
		return {
			name: profile.name,
			address1: profile.address1,
			address2: profile.address2,
			city: profile.city,
			state: profile.state,
			zip: profile.zip,
		};
	}
	return null;
};

// get profile name by profile id
export const getProfileNameById = async (id: string) => {
	const profile = await db.profile.findUnique({
		where: { id },
	});
	if (profile) {
		return profile.name;
	}
	return null;
};

// get the user (with profile) that owns a given profile id
export const getUserByProfileId = async (profileId: string) => {
	const profile = await db.profile.findUnique({
		where: { id: profileId },
		include: { user: true },
	});
	return profile?.user ?? null;
};

export const createVerificationToken = async (
	userId: string,
	type: string,
	expiresAt: Date
) => {
	const verificationToken = await db.verificationToken.create({
		data: { userId, type, token: generateVerificationToken(), expiresAt },
	});
	return verificationToken.token;
};

export const findVerificationToken = async (token: string) => {
	return await db.verificationToken.findUnique({
		where: { token },
		include: { user: true },
	});
};

export const deleteVerificationToken = async (id: string) => {
	try {
		return await db.verificationToken.delete({ where: { id } });
	} catch (error) {
		return error;
	}
};

export const markUserEmailVerified = async (userId: string) => {
	try {
		return await db.user.update({
			where: { id: userId },
			data: { emailVerified: true },
		});
	} catch (error) {
		return error;
	}
};
