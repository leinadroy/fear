import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/** Hanya izinkan redirect ke path internal (cegah open redirect). */
function safeRedirect(target: string | null): string {
	if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\'))
		return '/';
	return target;
}

export const load: PageLoad = async ({ parent, url }) => {
	const { user } = await parent();
	if (user) redirect(303, safeRedirect(url.searchParams.get('redirectTo')));
};
