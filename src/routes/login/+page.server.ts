import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { users } from '#lib/server/db/schema.ts';
import { DUMMY_HASH, verifyPassword } from '#lib/server/password.ts';
import { createSession, generateSessionToken, setSessionCookie } from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

/** Hanya izinkan redirect ke path internal (cegah open redirect). */
function safeRedirect(target: string | null): string {
	if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\'))
		return '/';
	return target;
}

// Pembatas percobaan login sederhana (in-memory, per IP + email).
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function isLocked(key: string): boolean {
	const entry = attempts.get(key);
	if (!entry) return false;
	if (Date.now() > entry.resetAt) {
		attempts.delete(key);
		return false;
	}
	return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string): void {
	const entry = attempts.get(key);
	if (!entry || Date.now() > entry.resetAt) {
		attempts.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
	} else {
		entry.count++;
	}
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) redirect(303, safeRedirect(url.searchParams.get('redirectTo')));
};

export const actions: Actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(form.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { email, message: 'Email dan password wajib diisi.' });
		}

		const key = `${getClientAddress()}|${email}`;
		if (isLocked(key)) {
			return fail(429, {
				email,
				message: 'Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.'
			});
		}

		const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

		// Tetap jalankan verifikasi walau user tidak ada, agar waktu respons sama.
		const valid = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password);

		if (!user || !valid) {
			recordFailure(key);
			return fail(400, { email, message: 'Email atau password salah.' });
		}
		if (!user.isActive) {
			return fail(403, { email, message: 'Akun ini dinonaktifkan. Hubungi admin.' });
		}

		attempts.delete(key);
		const token = generateSessionToken();
		const session = await createSession(token, user.id);
		setSessionCookie(cookies, token, session.expiresAt);

		redirect(303, safeRedirect(url.searchParams.get('redirectTo')));
	}
};
