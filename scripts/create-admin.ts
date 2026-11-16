/**
 * Membuat akun admin dari variabel di .env:
 *   ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
 *
 * Jalankan:  npm run db:create-admin
 * Reset password admin yang sudah ada:  npm run db:create-admin -- --reset
 */
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { users } from '../src/lib/server/db/schema.ts';
import { MIN_PASSWORD_LENGTH, hashPassword } from '../src/lib/server/password.ts';

const { DATABASE_URL, ADMIN_NAME = 'Administrator', ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
const reset = process.argv.includes('--reset');

function die(message: string): never {
	console.error(`✗ ${message}`);
	process.exit(1);
}

if (!DATABASE_URL) die('DATABASE_URL belum diisi di .env');
if (!ADMIN_EMAIL) die('ADMIN_EMAIL belum diisi di .env');
if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < MIN_PASSWORD_LENGTH)
	die(`ADMIN_PASSWORD di .env wajib diisi, minimal ${MIN_PASSWORD_LENGTH} karakter`);

const email = ADMIN_EMAIL.trim().toLowerCase();
const pool = mysql.createPool(DATABASE_URL);
const db = drizzle(pool);

try {
	const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
	const passwordHash = await hashPassword(ADMIN_PASSWORD);

	if (existing) {
		if (!reset) {
			console.log(`• Admin ${email} sudah ada. Pakai --reset untuk mengganti password-nya.`);
		} else {
			await db
				.update(users)
				.set({ passwordHash, role: 'admin', isActive: true })
				.where(eq(users.id, existing.id));
			console.log(`✓ Password admin ${email} diperbarui.`);
		}
	} else {
		await db.insert(users).values({ name: ADMIN_NAME, email, passwordHash, role: 'admin' });
		console.log(`✓ Akun admin ${email} dibuat.`);
	}
} finally {
	await pool.end();
}
