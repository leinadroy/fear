import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { workOrders } from '#lib/server/db/schema.ts';
import { parseForm } from '#lib/server/form.ts';
import { parseId, requireUser } from '#lib/server/guard.ts';
import { workOrderFormOptions, workOrderSchema } from '#lib/server/work-orders.ts';
import { MANAGER_ROLES } from '#lib/enums.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireUser(locals, MANAGER_ROLES);
	const [item] = await db
		.select()
		.from(workOrders)
		.where(eq(workOrders.id, parseId(params.id)))
		.limit(1);
	if (!item) error(404, 'Work order tidak ditemukan.');
	return { item, ...(await workOrderFormOptions(item.activityTypeId)) };
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		requireUser(locals, MANAGER_ROLES);
		const id = parseId(params.id);
		const { data, failure } = parseForm(workOrderSchema, await request.formData());
		if (failure) return failure;

		await db.update(workOrders).set(data).where(eq(workOrders.id, id));
		redirect(303, `/work-orders/${id}`);
	}
};
