import { like, or, type SQL } from 'drizzle-orm';
import type { MySqlColumn } from 'drizzle-orm/mysql-core';

/** Kondisi "mengandung q" (case-insensitive bawaan collation) di salah satu kolom. */
export function search(q: string | null | undefined, ...columns: MySqlColumn[]): SQL | undefined {
	const term = q?.trim();
	if (!term) return undefined;
	const pattern = `%${term.replace(/[\\%_]/g, '\\$&')}%`;
	return or(...columns.map((c) => like(c, pattern)));
}
