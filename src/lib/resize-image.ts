const MAX_DIMENSION = 1600;
// leave already-small photos alone
const SKIP_BELOW_BYTES = 400 * 1024;
// keep each upload well under host request-body limits (5 photos must fit in a few MB)
const TARGET_BYTES = 800 * 1024;
const QUALITY_STEPS = [0.85, 0.75, 0.65];

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
	new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

const extensionFor = (type: string) =>
	type === 'image/webp' ? 'webp' : type === 'image/png' ? 'png' : 'jpg';

// Downscales a photo (client side only) so uploads stay small. Returns the
// original file when it is already small enough or resizing doesn't help.
export const resizeImage = async (file: File): Promise<File> => {
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file, {
			imageOrientation: 'from-image',
		} as ImageBitmapOptions);
	} catch {
		// couldn't decode it here; let the server decide
		return file;
	}

	const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
	if (scale === 1 && file.size <= SKIP_BELOW_BYTES) {
		bitmap.close();
		return file;
	}

	const canvas = document.createElement('canvas');
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	const context = canvas.getContext('2d');
	if (!context) {
		bitmap.close();
		return file;
	}

	// JPEG has no transparency, so paint white behind it first
	const drawWithBackground = (background: boolean) => {
		context.clearRect(0, 0, canvas.width, canvas.height);
		if (background) {
			context.fillStyle = '#ffffff';
			context.fillRect(0, 0, canvas.width, canvas.height);
		}
		context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	};

	// JPEG stays JPEG; PNG/WebP go to WebP (keeps transparency), falling back to
	// JPEG on browsers that can't encode WebP
	let type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
	let best: Blob | null = null;
	for (const quality of QUALITY_STEPS) {
		drawWithBackground(type === 'image/jpeg');
		let blob = await toBlob(canvas, type, quality);
		if (blob && blob.type !== type) {
			// the browser ignored the requested type
			type = 'image/jpeg';
			drawWithBackground(true);
			blob = await toBlob(canvas, type, quality);
		}
		if (!blob) break;
		best = blob;
		if (blob.size <= TARGET_BYTES) break;
	}
	bitmap.close();

	if (!best || (scale === 1 && best.size >= file.size)) {
		return file;
	}

	const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
	return new File([best], `${baseName}.${extensionFor(best.type)}`, {
		type: best.type,
	});
};
