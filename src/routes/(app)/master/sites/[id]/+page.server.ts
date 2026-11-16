import { error, fail, redirect } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import { customers, sites } from '#lib/server/db/schema.ts';
import { isDuplicate, isReferenced } from '#lib/server/db/errors.ts';
import { code, fieldError, optDecimal, optText, parseForm, ref, text } from '#lib/server/form.ts';
import { parseId } from '#lib/server/guard.ts';
import type { Actions, PageServerLoad } from './$types';

const LIST = '/master/sites';

const schema = z.object({
	customerId: ref('Pelanggan'),
	code: code(),
	name: text('Nama lokasi', 150),
	address: optText(),
	latitude: optDecimal(-90, 90, 'Latitude'),
	longitude: optDecimal(-180, 180, 'Longitude')
});

export const load: PageServerLoad = async ({ params, url }) => {
	const customerOptions = await db
		.select({ id: customers.id, name: customers.name })
		.from(customers)
		.orderBy(asc(customers.name));

	if (params.id === 'new') {
		const preset = Number(url.searchParams.get('customer')) || null;
		return { item: preset ? { customerId: preset } : null, isNew: true, customerOptions };
	}
	const [item] = await db
		.select()
		.from(sites)
		.where(eq(sites.id, parseId(params.id)))
		.limit(1);
	if (!item) error(404, 'Lokasi tidak ditemukan.');
	return { item, isNew: false, customerOptions };
};

export const actions: Actions = {
	save: async ({ request, params }) => {
		const formData = await request.formData();
		const { data, failure } = parseForm(schema, formData);
		if (failure) return failure;

		try {
			if (params.id === 'new') await db.insert(sites).values(data);
			else
				await db
					.update(sites)
					.set(data)
					.where(eq(sites.id, parseId(params.id)));
		} catch (e) {
			if (isDuplicate(e)) return fieldError(formData, 'code', 'Kode sudah dipakai lokasi lain.');
			throw e;
		}
		redirect(303, LIST);
	},

	delete: async ({ params }) => {
		try {
			await db.delete(sites).where(eq(sites.id, parseId(params.id)));
		} catch (e) {
			if (isReferenced(e))
				return fail(409, { message: 'Lokasi sudah dipakai di work order, tidak bisa dihapus.' });
			throw e;
		}
		redirect(303, LIST);
	}
};
