import mysql from 'mysql2/promise';

/**
 * Pool MySQL dengan sesi ber-zona waktu UTC.
 * Drizzle membaca/menulis DATETIME/TIMESTAMP sebagai UTC, jadi `NOW()` / DEFAULT
 * di database juga harus UTC agar `created_at` tidak bergeser 7 jam (WIB).
 * Tidak mengimpor apa pun dari SvelteKit agar bisa dipakai di scripts/.
 */
export function createPool(url: string) {
	const pool = mysql.createPool({ uri: url, timezone: 'Z' });
	pool.pool.on('connection', (conn) => {
		conn.query("SET time_zone = '+00:00'");
	});
	return pool;
}
