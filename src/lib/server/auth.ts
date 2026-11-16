import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { db } from './db';
import { sessions, users, type Session, type User } from './db/schema';

export const SESSION_COOKIE = 'fear_session';

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 30 * DAY_MS;
/** Perpanjang sesi otomatis jika sisa umurnya kurang dari ini. */
const SESSION_RENEW_MS = 15 * DAY_MS;

/** Data user yang aman dibawa ke `locals` / halaman (tanpa password hash). */
export type SessionUser = Pick<User, 'id' | 'name' | 'email' | 'role'>;

export function generateSessionToken(): string {
	return randomBytes(32).toString('base64url');
}

function sessionIdFromToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export async function createSession(token: string, userId: number): Promise<Session> {
	const session: Session = {
		id: sessionIdFromToken(token),
		userId,
		expiresAt: new Date(Date.now() + SESSION_TTL_MS),
		createdAt: new Date()
	};
	await db.insert(sessions).values(session);
	return session;
}

export async function validateSessionToken(
	token: string
): Promise<{ session: Session; user: SessionUser } | { session: null; user: null }> {
	const sessionId = sessionIdFromToken(token);
	const [row] = await db
		.select({
			session: sessions,
			user: { id: users.id, name: users.name, email: users.email, role: users.role },
			isActive: users.isActive
		})
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, sessionId))
		.limit(1);

	if (!row) return { session: null, user: null };

	const { session, user, isActive } = row;
	if (Date.now() >= session.expiresAt.getTime() || !isActive) {
		await db.delete(sessions).where(eq(sessions.id, session.id));
		return { session: null, user: null };
	}

	if (session.expiresAt.getTime() - Date.now() < SESSION_RENEW_MS) {
		session.expiresAt = new Date(Date.now() + SESSION_TTL_MS);
		await db
			.update(sessions)
			.set({ expiresAt: session.expiresAt })
			.where(eq(sessions.id, session.id));
	}

	return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date): void {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		expires: expiresAt
	});
}

export function deleteSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
