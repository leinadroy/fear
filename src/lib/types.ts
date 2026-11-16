import type { UserRole } from './enums.ts';

/** User yang sedang login (dari GET /api/me). */
export type SessionUser = { id: number; name: string; email: string; role: UserRole };

/**
 * Hasil form action dari API PHP (prop `form` halaman). Bentuknya bebas per aksi,
 * mis. `{ values, errors }` saat validasi gagal.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ActionForm = Record<string, any> | null | undefined;
