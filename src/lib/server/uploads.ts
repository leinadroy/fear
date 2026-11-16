import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** Folder penyimpanan file upload (di luar `static/` agar tidak publik). */
export const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || 'uploads');

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export const IMAGE_TYPES: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp'
};

export const CONTENT_TYPES: Record<string, string> = Object.fromEntries(
	Object.entries(IMAGE_TYPES).map(([type, ext]) => [ext, type])
);

/** Validasi file foto; kembalikan pesan error atau null. */
export function validatePhoto(file: File): string | null {
	if (!IMAGE_TYPES[file.type]) return `${file.name}: format harus JPG, PNG, atau WEBP.`;
	if (file.size > MAX_PHOTO_BYTES) return `${file.name}: ukuran maksimal 10 MB.`;
	return null;
}

/** Simpan foto kunjungan. Return path relatif terhadap UPLOAD_ROOT (pakai '/'). */
export async function savePhoto(activityId: number, file: File): Promise<string> {
	const rel = `activities/${activityId}/${randomUUID()}.${IMAGE_TYPES[file.type]}`;
	const abs = path.join(UPLOAD_ROOT, rel);
	await mkdir(path.dirname(abs), { recursive: true });
	await writeFile(abs, Buffer.from(await file.arrayBuffer()));
	return rel;
}

/** Path absolut yang aman untuk path relatif, atau null jika mencoba keluar dari UPLOAD_ROOT. */
export function resolveUpload(rel: string): string | null {
	const abs = path.resolve(UPLOAD_ROOT, rel);
	return abs.startsWith(UPLOAD_ROOT + path.sep) ? abs : null;
}

export async function deleteUpload(rel: string): Promise<void> {
	const abs = resolveUpload(rel);
	if (abs) await rm(abs, { force: true });
}
