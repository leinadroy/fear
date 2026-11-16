import { error, redirect } from '@sveltejs/kit';
import type { UserRole } from '../enums';
import type { SessionUser } from './auth';

/** Pastikan user login dan (opsional) punya salah satu peran yang diizinkan. */
export function requireUser(locals: App.Locals, roles?: readonly UserRole[]): SessionUser {
	if (!locals.user) redirect(303, '/login');
	if (roles && !roles.includes(locals.user.role)) {
		error(403, 'Anda tidak punya akses ke halaman ini.');
	}
	return locals.user;
}

/** Ambil parameter id numerik dari URL, atau 404. */
export function parseId(value: string): number {
	const id = Number(value);
	if (!Number.isSafeInteger(id) || id <= 0) error(404, 'Data tidak ditemukan.');
	return id;
}
