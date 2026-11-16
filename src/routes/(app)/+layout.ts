import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

/**
 * Semua halaman di grup (app) butuh login; `user` di sini dijamin tidak null.
 * Pengunjung yang belum login dan membuka beranda diarahkan ke landing page.
 */
export const load: LayoutLoad = async ({ parent, url }) => {
	const { user } = await parent();
	if (!user) {
		const target = url.pathname + url.search;
		redirect(303, target === '/' ? '/welcome' : `/login?redirectTo=${encodeURIComponent(target)}`);
	}
	return { user };
};
