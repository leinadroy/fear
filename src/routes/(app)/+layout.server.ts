import { requireUser } from '#lib/server/guard.ts';
import type { LayoutServerLoad } from './$types';

/** Semua halaman di grup (app) butuh login; `user` di sini dijamin tidak null. */
export const load: LayoutServerLoad = ({ locals }) => ({ user: requireUser(locals) });
