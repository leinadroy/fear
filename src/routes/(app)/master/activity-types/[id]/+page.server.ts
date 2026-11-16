import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import { activityTypes } from '#lib/server/db/schema.ts';
import { isDuplicate, isReferenced } from '#lib/server/db/errors.ts';
import { checkbox, code, fieldError, optText, parseForm, text } from '#lib/server/form.ts';
import { parseId } from '#lib/server/guard.ts';
import type { Actions, PageServerLoad } from './$types';

const LIST = '/master/activity-types';

const schema = z.object({
	code: code(),
	name: text('Nama', 100),
	description: optText(),
	isActive: checkbox
});

export const load: PageServerLoad = async ({ params }) => {
	if (params.id === 'new') return { item: null };
	const [item] = await db
		.select()
		.from(activityTypes)
		.where(eq(activityTypes.id, parseId(params.id)))
		.limit(1);
	if (!item) error(404, 'Jenis aktivitas tidak ditemukan.');
	return { item };
};

export const actions: Actions = {
	save: async ({ request, params }) => {
		const formData = await request.formData();
		const { data, failure } = parseForm(schema, formData);
		if (failure) return failure;

		try {
			if (params.id === 'new') await db.insert(activityTypes).values(data);
			else
				await db
					.update(activityTypes)
					.set(data)
					.where(eq(activityTypes.id, parseId(params.id)));
		} catch (e) {
			if (isDuplicate(e)) return fieldError(formData, 'code', 'Kode sudah dipakai.');
			throw e;
		}
		redirect(303, LIST);
	},

	delete: async ({ params }) => {
		try {
			await db.delete(activityTypes).where(eq(activityTypes.id, parseId(params.id)));
		} catch (e) {
			if (isReferenced(e))
				return fail(409, {
					message: 'Jenis ini sudah dipakai di work order. Nonaktifkan saja agar tidak muncul lagi.'
				});
			throw e;
		}
		redirect(303, LIST);
	}
};
