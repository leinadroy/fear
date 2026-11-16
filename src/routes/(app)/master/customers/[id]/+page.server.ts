import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import { customers } from '#lib/server/db/schema.ts';
import { isDuplicate, isReferenced } from '#lib/server/db/errors.ts';
import { code, fieldError, optEmail, optText, parseForm, text } from '#lib/server/form.ts';
import { parseId } from '#lib/server/guard.ts';
import type { Actions, PageServerLoad } from './$types';

const LIST = '/master/customers';

const schema = z.object({
	code: code(),
	name: text('Nama', 150),
	contactPerson: optText(100),
	phone: optText(30),
	email: optEmail(),
	address: optText()
});

export const load: PageServerLoad = async ({ params }) => {
	if (params.id === 'new') return { item: null };
	const [item] = await db
		.select()
		.from(customers)
		.where(eq(customers.id, parseId(params.id)))
		.limit(1);
	if (!item) error(404, 'Pelanggan tidak ditemukan.');
	return { item };
};

export const actions: Actions = {
	save: async ({ request, params }) => {
		const formData = await request.formData();
		const { data, failure } = parseForm(schema, formData);
		if (failure) return failure;

		try {
			if (params.id === 'new') await db.insert(customers).values(data);
			else
				await db
					.update(customers)
					.set(data)
					.where(eq(customers.id, parseId(params.id)));
		} catch (e) {
			if (isDuplicate(e)) return fieldError(formData, 'code', 'Kode sudah dipakai pelanggan lain.');
			throw e;
		}
		redirect(303, LIST);
	},

	delete: async ({ params }) => {
		try {
			await db.delete(customers).where(eq(customers.id, parseId(params.id)));
		} catch (e) {
			if (isReferenced(e))
				return fail(409, { message: 'Pelanggan masih punya lokasi. Hapus lokasinya dulu.' });
			throw e;
		}
		redirect(303, LIST);
	}
};
