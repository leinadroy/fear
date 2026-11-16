/**
 * Hash password memakai scrypt bawaan Node (tanpa dependency native).
 * Format tersimpan: scrypt$N$r$p$<salt base64url>$<hash base64url>
 * Modul ini sengaja tidak mengimpor apa pun dari SvelteKit agar bisa dipakai di scripts/.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const N = 16384;
const R = 8;
const P = 1;
const KEY_LEN = 64;

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions) {
	return new Promise<Buffer>((resolve, reject) =>
		scryptCb(password.normalize('NFKC'), salt, keylen, opts, (err, key) =>
			err ? reject(err) : resolve(key)
		)
	);
}

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16);
	const hash = await scrypt(password, salt, KEY_LEN, { N, r: R, p: P });
	return ['scrypt', N, R, P, salt.toString('base64url'), hash.toString('base64url')].join('$');
}

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
	const parts = stored.split('$');
	if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
	const [, n, r, p, saltB64, hashB64] = parts;
	const expected = Buffer.from(hashB64, 'base64url');
	const actual = await scrypt(password, Buffer.from(saltB64, 'base64url'), expected.length, {
		N: Number(n),
		r: Number(r),
		p: Number(p)
	});
	return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Hash dummy untuk menyamakan waktu respons saat email tidak ditemukan. */
export const DUMMY_HASH =
	'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$' + Buffer.alloc(KEY_LEN).toString('base64url');

export const MIN_PASSWORD_LENGTH = 8;
