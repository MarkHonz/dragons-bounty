import db from './db';

export type CreateUserProps = {
	name: string;
	email: string;
	password: string;
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
					},
				},
			},
		});
	} catch (error) {
		// console.error(error);
		return error;
	}
};

export const getUsers = async () => {
	return await db.user.findMany({
		include: { profile: {} },
	});
};

export const deleteUser = async (id: string) => {
	return await db.user.delete({
		where: { id: id },
		include: { profile: {}, sessions: {} },
	});
};

export const findUserByEmail = async (email: string) => {
	return await db.user.findUnique({
		where: { email },
		include: { profile: {} },
	});
};
