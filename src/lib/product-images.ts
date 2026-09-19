export const MAX_PRODUCT_IMAGES = 5;
// what the server accepts per uploaded file
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// what the browser accepts before it shrinks the photo down (phone photos are big)
export const MAX_ORIGINAL_IMAGE_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// returns an error message, or null when the file is acceptable
export const validateImageFile = (
	file: File,
	maxBytes: number = MAX_IMAGE_BYTES
) => {
	if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
		return `${file.name}: only JPG, PNG and WebP images are allowed`;
	}
	if (file.size > maxBytes) {
		return `${file.name}: images must be ${Math.round(maxBytes / 1024 / 1024)} MB or smaller`;
	}
	if (file.size === 0) {
		return `${file.name}: the file is empty`;
	}
	return null;
};
