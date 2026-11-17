import { apiGet } from '#lib/api.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, url }) => {
	const token = url.searchParams.get('token') ?? '';
	const { valid, email } = (await apiGet(
		fetch,
		`/reset-password?token=${encodeURIComponent(token)}`,
		url
	)) as { valid: boolean; email: string | null };
	return { token, valid, email };
};
