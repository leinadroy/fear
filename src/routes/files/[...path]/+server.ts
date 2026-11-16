import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { CONTENT_TYPES, resolveUpload } from '#lib/server/uploads.ts';
import { requireUser } from '#lib/server/guard.ts';
import type { RequestHandler } from './$types';

/** Sajikan file upload hanya untuk user yang login. */
export const GET: RequestHandler = async ({ params, locals }) => {
	requireUser(locals);
	const abs = resolveUpload(params.path);
	const type = CONTENT_TYPES[path.extname(params.path).slice(1).toLowerCase()];
	if (!abs || !type) error(404, 'File tidak ditemukan.');

	try {
		const body = await readFile(abs);
		return new Response(body, {
			headers: {
				'content-type': type,
				'cache-control': 'private, max-age=86400',
				'x-content-type-options': 'nosniff'
			}
		});
	} catch {
		error(404, 'File tidak ditemukan.');
	}
};
