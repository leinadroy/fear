import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import { sessions, users } from '#lib/server/db/schema.ts';
import { isDuplicate, isReferenced } from '#lib/server/db/errors.ts';
import { checkbox, email, enumOf, fieldError, optText, parseForm, text } from '#lib/server/form.ts';
import { parseId, requireUser } from '#lib/server/guard.ts';
import { hashPassword, MIN_PASSWORD_LENGTH } from '#lib/server/password.ts';
import { USER_ROLES } from '#lib/enums.ts';
import type { Actions, PageServerLoad } from './$types';

const LIST = '/users';

const password = z
	.string({ error: 'Password wajib diisi.' })
	.min(MIN_PASSWORD_LENGTH, `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`)
	.max(200);

const profileSchema = z.object({
	name: text('Nama', 100),
	email: email(),
	phone: optText(30),
	role: enumOf(USER_ROLES, 'Peran'),
	isActive: checkbox
});

const newUserSchema = profileSchema
	.extend({ password, passwordConfirm: z.string() })
	.refine((d) => d.password === d.passwordConfirm, {
		message: 'Konfirmasi password tidak sama.',
		path: ['passwordConfirm']
	});

const passwordSchema = z
	.object({ password, passwordConfirm: z.string() })
	.refine((d) => d.password === d.passwordConfirm, {
		message: 'Konfirmasi password tidak sama.',
		path: ['passwordConfirm']
	});

export const load: PageServerLoad = async ({ params }) => {
	if (params.id === 'new') return { item: null };
	const [item] = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			phone: users.phone,
			role: users.role,
			isActive: users.isActive,
			createdAt: users.createdAt
		})
		.from(users)
		.where(eq(users.id, parseId(params.id)))
		.limit(1);
	if (!item) error(404, 'Pengguna tidak ditemukan.');
	return { item };
};

export const actions: Actions = {
	save: async ({ request, params, locals }) => {
		const me = requireUser(locals, ['admin']);
		const formData = await request.formData();

		try {
			if (params.id === 'new') {
				const { data, failure } = parseForm(newUserSchema, formData);
				if (failure) return failure;
				const { password: pw, name, email, phone, role, isActive } = data;
				const profile = { name, email, phone, role, isActive };
				const [res] = await db
					.insert(users)
					.values({ ...profile, passwordHash: await hashPassword(pw) });
				redirect(303, `${LIST}/${res.insertId}?saved=1`);
			}

			const id = parseId(params.id);
			const { data, failure } = parseForm(profileSchema, formData);
			if (failure) return failure;

			// Jangan sampai admin mengunci dirinya sendiri.
			if (id === me.id && (data.role !== 'admin' || !data.isActive)) {
				return fieldError(
					formData,
					'role',
					'Anda tidak bisa menurunkan peran atau menonaktifkan akun sendiri.'
				);
			}

			await db.update(users).set(data).where(eq(users.id, id));
			if (!data.isActive) await db.delete(sessions).where(eq(sessions.userId, id));
		} catch (e) {
			if (isDuplicate(e)) return fieldError(formData, 'email', 'Email sudah dipakai akun lain.');
			throw e;
		}
		redirect(303, LIST);
	},

	password: async ({ request, params, locals }) => {
		const me = requireUser(locals, ['admin']);
		const id = parseId(params.id);
		const formData = await request.formData();
		const { data, failure } = parseForm(passwordSchema, formData);
		if (failure) return fail(400, { pwErrors: failure.data.errors });

		await db
			.update(users)
			.set({ passwordHash: await hashPassword(data.password) })
			.where(eq(users.id, id));
		// Paksa login ulang di semua perangkat milik user tsb (kecuali sesi admin yang sedang dipakai).
		if (id !== me.id) await db.delete(sessions).where(eq(sessions.userId, id));
		return { pwSaved: true };
	},

	delete: async ({ params, locals }) => {
		const me = requireUser(locals, ['admin']);
		const id = parseId(params.id);
		if (id === me.id) return fail(400, { message: 'Anda tidak bisa menghapus akun sendiri.' });
		try {
			await db.delete(users).where(eq(users.id, id));
		} catch (e) {
			if (isReferenced(e))
				return fail(409, {
					message:
						'Pengguna ini sudah punya riwayat (work order / aktivitas). Nonaktifkan saja akunnya.'
				});
			throw e;
		}
		redirect(303, LIST);
	}
};
