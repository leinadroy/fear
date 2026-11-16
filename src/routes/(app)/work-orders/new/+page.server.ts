import { redirect } from '@sveltejs/kit';
import { parseForm } from '#lib/server/form.ts';
import { requireUser } from '#lib/server/guard.ts';
import { insertWorkOrder, workOrderFormOptions, workOrderSchema } from '#lib/server/work-orders.ts';
import { MANAGER_ROLES } from '#lib/enums.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireUser(locals, MANAGER_ROLES);
	return workOrderFormOptions();
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireUser(locals, MANAGER_ROLES);
		const { data, failure } = parseForm(workOrderSchema, await request.formData());
		if (failure) return failure;

		const id = await insertWorkOrder({ ...data, createdBy: user.id, status: 'draft' });
		redirect(303, `/work-orders/${id}`);
	}
};
