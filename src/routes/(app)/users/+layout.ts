import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ parent }) => {
	const { user } = await parent();
	if (user.role !== 'admin') error(403, 'Anda tidak punya akses ke halaman ini.');
};
