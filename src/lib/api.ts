/**
 * Penghubung frontend (SvelteKit SPA) dengan API PHP di `/api`.
 * Setiap halaman memuat datanya dari `GET /api<path halaman>`.
 */
import { error, redirect } from '@sveltejs/kit';

const DATE_KEY = /At$|^scheduled/;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

/** Ubah string tanggal ISO dari API (kolom *At / scheduled*) jadi Date. */
function revive(value: unknown, key = ''): unknown {
	if (Array.isArray(value)) return value.map((v) => revive(v));
	if (value && typeof value === 'object') {
		return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, revive(v, k)]));
	}
	if (typeof value === 'string' && DATE_KEY.test(key) && ISO_UTC.test(value))
		return new Date(value);
	return value;
}

function loginUrl(url: URL): string {
	const target = url.pathname + url.search;
	return target === '/' ? '/login' : `/login?redirectTo=${encodeURIComponent(target)}`;
}

/** GET ke API; 401 → ke halaman login, error lain → halaman error aplikasi. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- bentuk data ditentukan API PHP
export async function apiGet(fetch: typeof globalThis.fetch, path: string, url: URL): Promise<any> {
	const res = await fetch(`/api${path}`, { headers: { accept: 'application/json' } });
	if (res.status === 401) redirect(303, loginUrl(url));

	let body: { message?: string; install?: string } | null = null;
	try {
		body = await res.json();
	} catch {
		// respons bukan JSON (mis. PHP error / server mati)
	}
	if (res.status === 503 && body?.install) {
		// Belum terpasang → buka penginstal (halaman PHP biasa, bukan bagian SPA).
		location.href = body.install;
	}
	if (!res.ok || !body) error(res.status || 500, body?.message ?? 'Tidak bisa menghubungi server.');
	return revive(body);
}

/** `load` standar: ambil data untuk halaman ini dari API dengan path & query yang sama. */
export const apiLoad = ({ fetch, url }: { fetch: typeof globalThis.fetch; url: URL }) =>
	apiGet(fetch, url.pathname + url.search, url);
