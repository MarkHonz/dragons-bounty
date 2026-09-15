import db from '@/db/db';

export type UserProps = {
	id: string;
	email: string;
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

// paginated users
export const getUsersPaginated = async (page: number, perPage: number) => {
	const skip = Math.max(0, (page - 1) * perPage);
	const [users, total] = await Promise.all([
		db.user.findMany({
			include: { profile: { include: { Cart: true } } },
			skip,
			take: perPage,
			orderBy: { createdAt: 'desc' },
		}),
		db.user.count(),
	]);

	return { users, total };
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
