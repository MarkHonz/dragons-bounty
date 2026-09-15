'use server';

import { revalidatePath } from 'next/cache';
import { addPhoto, deletePhoto } from '@/db/photos-db';
import { assertAdminOrThrow } from '@/lib/auth';

export const addPhotoAction = async (formData: FormData) => {
	await assertAdminOrThrow();
	const url = formData.get('url')?.toString() ?? '';
	const key = formData.get('key')?.toString() ?? null;
	const caption = formData.get('caption')?.toString() ?? null;
	if (!url) return;
	await addPhoto({ url, key, caption });
	revalidatePath('/');
	revalidatePath('/admin/photos');
};

export const deletePhotoAction = async (formData: FormData) => {
	await assertAdminOrThrow();
	const id = formData.get('id')?.toString();
	if (!id) return;
	await deletePhoto(id);
	revalidatePath('/');
	revalidatePath('/admin/photos');
};
