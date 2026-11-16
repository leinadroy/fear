import { requireUser } from '#lib/server/guard.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	requireUser(locals, ['admin']);
};
