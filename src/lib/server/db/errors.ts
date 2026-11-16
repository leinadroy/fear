/** Ambil errno MySQL dari error (Drizzle membungkusnya di `cause`). */
function errno(e: unknown): number | undefined {
	let cur: unknown = e;
	for (let i = 0; i < 3 && cur && typeof cur === 'object'; i++) {
		if ('errno' in cur && typeof cur.errno === 'number') return cur.errno;
		cur = 'cause' in cur ? cur.cause : undefined;
	}
	return undefined;
}

/** Pelanggaran UNIQUE (ER_DUP_ENTRY). */
export const isDuplicate = (e: unknown) => errno(e) === 1062;

/** Data masih dipakai tabel lain (ER_ROW_IS_REFERENCED). */
export const isReferenced = (e: unknown) => {
	const n = errno(e);
	return n === 1451 || n === 1217;
};
