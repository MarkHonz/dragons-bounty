import db from '@/db/db';

export type PhotoProps = {
	id: string;
	url: string;
	key?: string | null;
	caption?: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export const getPhotos = async (): Promise<PhotoProps[]> => {
	try {
		return (await db.photo.findMany({
			orderBy: { createdAt: 'desc' },
		})) as PhotoProps[];
	} catch {
		return [];
	}
};

export const addPhoto = async ({
	url,
	key,
	caption,
}: {
	url: string;
	key?: string | null;
	caption?: string | null;
}) => {
	return await db.photo.create({ data: { url, key, caption } });
};

export const deletePhoto = async (id: string) => {
	return await db.photo.delete({ where: { id } });
};
