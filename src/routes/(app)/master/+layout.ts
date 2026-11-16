import { error } from '@sveltejs/kit';
import { isManager } from '#lib/enums.ts';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ parent }) => {
	const { user } = await parent();
	if (!isManager(user.role)) error(403, 'Anda tidak punya akses ke halaman ini.');
};
