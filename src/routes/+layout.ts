import { apiGet } from '#lib/api.ts';
import type { SessionUser } from '#lib/types.ts';
import type { LayoutLoad } from './$types';

// Aplikasi berjalan sebagai SPA statis; semua data diambil dari API PHP.
export const ssr = false;
export const prerender = false;

export const load: LayoutLoad = async ({ fetch, url }) => {
	const { user } = (await apiGet(fetch, '/me', url)) as { user: SessionUser | null };
	return { user };
};
