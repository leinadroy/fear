import { requireUser } from '#lib/server/guard.ts';
import { MANAGER_ROLES } from '#lib/enums.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	requireUser(locals, MANAGER_ROLES);
};
