import { error, redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { MANAGER_ROLES, type UserRole } from '#lib/enums.ts';
import {
	SESSION_COOKIE,
	deleteSessionCookie,
	setSessionCookie,
	validateSessionToken
} from '#lib/server/auth.ts';

/** Route yang boleh diakses tanpa login. */
const PUBLIC_PATHS = ['/login'];

/** Bagian aplikasi yang dibatasi per peran. */
const ROLE_RULES: { prefix: string; roles: readonly UserRole[] }[] = [
	{ prefix: '/master', roles: MANAGER_ROLES },
	{ prefix: '/users', roles: ['admin'] }
];

const isPublic = (pathname: string) =>
	PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);

	if (token) {
		const { session, user } = await validateSessionToken(token);
		if (session) setSessionCookie(event.cookies, token, session.expiresAt);
		else deleteSessionCookie(event.cookies);
		event.locals.user = user;
		event.locals.session = session;
	} else {
		event.locals.user = null;
		event.locals.session = null;
	}

	if (!event.locals.user && !isPublic(event.url.pathname)) {
		const redirectTo = event.url.pathname + event.url.search;
		const query = redirectTo === '/' ? '' : `?redirectTo=${encodeURIComponent(redirectTo)}`;
		redirect(303, `/login${query}`);
	}

	// Form action (POST) tidak menjalankan `load` layout, jadi pembatasan peran untuk
	// request yang mengubah data dicek di sini. Halaman (GET) dijaga oleh +layout.server.ts
	// masing-masing agar tampil dengan halaman error aplikasi.
	if (event.locals.user && event.request.method !== 'GET') {
		const rule = ROLE_RULES.find(
			(r) => event.url.pathname === r.prefix || event.url.pathname.startsWith(r.prefix + '/')
		);
		if (rule && !rule.roles.includes(event.locals.user.role)) {
			error(403, 'Anda tidak punya akses untuk tindakan ini.');
		}
	}

	return resolve(event);
};
