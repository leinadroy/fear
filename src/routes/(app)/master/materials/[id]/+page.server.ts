import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import { materials } from '#lib/server/db/schema.ts';
import { isDuplicate, isReferenced } from '#lib/server/db/errors.ts';
import { code, fieldError, parseForm, text } from '#lib/server/form.ts';
import { parseId } from '#lib/server/guard.ts';
import type { Actions, PageServerLoad } from './$types';

const LIST = '/master/materials';

const schema = z.object({
	code: code(),
	name: text('Nama', 150),
	unit: text('Satuan', 20)
});

export const load: PageServerLoad = async ({ params }) => {
	if (params.id === 'new') return { item: null };
	const [item] = await db
		.select()
		.from(materials)
		.where(eq(materials.id, parseId(params.id)))
		.limit(1);
	if (!item) error(404, 'Material tidak ditemukan.');
	return { item };
};

export const actions: Actions = {
	save: async ({ request, params }) => {
		const formData = await request.formData();
		const { data, failure } = parseForm(schema, formData);
		if (failure) return failure;

		try {
			if (params.id === 'new') await db.insert(materials).values(data);
			else
				await db
					.update(materials)
					.set(data)
					.where(eq(materials.id, parseId(params.id)));
		} catch (e) {
			if (isDuplicate(e)) return fieldError(formData, 'code', 'Kode sudah dipakai.');
			throw e;
		}
		redirect(303, LIST);
	},

	delete: async ({ params }) => {
		try {
			await db.delete(materials).where(eq(materials.id, parseId(params.id)));
		} catch (e) {
			if (isReferenced(e))
				return fail(409, { message: 'Material sudah tercatat dipakai, tidak bisa dihapus.' });
			throw e;
		}
		redirect(303, LIST);
	}
};
