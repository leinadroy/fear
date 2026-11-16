import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import {
	SESSION_COOKIE,
	deleteSessionCookie,
	setSessionCookie,
	validateSessionToken
} from '#lib/server/auth.ts';

/** Route yang boleh diakses tanpa login. */
const PUBLIC_PATHS = ['/login'];

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

	return resolve(event);
};
