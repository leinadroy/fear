import { fail } from '@sveltejs/kit';
import { z } from 'zod';

/** Field yang tidak dikembalikan ke form saat validasi gagal. */
const SECRET_FIELDS = new Set(['password', 'passwordConfirm']);

export type FormErrors = Record<string, string>;

function formValues(formData: FormData): Record<string, string> {
	const values: Record<string, string> = {};
	for (const [key, value] of formData) {
		if (typeof value === 'string' && !SECRET_FIELDS.has(key)) values[key] = value;
	}
	return values;
}

/**
 * Validasi FormData dengan schema zod.
 * Berhasil → `{ data }`; gagal → `{ failure }` (sudah berupa `fail(400, ...)`, tinggal di-return).
 */
export function parseForm<T extends z.ZodType>(schema: T, formData: FormData) {
	const raw: Record<string, unknown> = {};
	for (const key of new Set(formData.keys())) {
		const all = formData.getAll(key);
		raw[key] = all.length > 1 ? all : all[0];
	}
	const result = schema.safeParse(raw);
	if (result.success) return { data: result.data as z.output<T>, failure: null };

	const errors: FormErrors = {};
	for (const issue of result.error.issues) {
		const key = String(issue.path[0] ?? '_form');
		errors[key] ??= issue.message;
	}
	return { data: null, failure: fail(400, { values: formValues(formData), errors }) };
}

/** `fail` dengan pesan error untuk satu field (mis. kode duplikat). */
export function fieldError(formData: FormData, field: string, message: string) {
	return fail(400, { values: formValues(formData), errors: { [field]: message } as FormErrors });
}

// ─── Potongan schema yang sering dipakai ─────────────────────────────────────

/** Teks wajib. */
export const text = (label: string, max = 255) =>
	z
		.string({ error: `${label} wajib diisi.` })
		.trim()
		.min(1, `${label} wajib diisi.`)
		.max(max, `${label} maksimal ${max} karakter.`);

/** Teks opsional; string kosong → null. */
export const optText = (max = 65535) =>
	z
		.string()
		.trim()
		.max(max, `Maksimal ${max} karakter.`)
		.optional()
		.transform((v) => v || null);

/** Kode unik: huruf besar, angka, strip, titik, garis bawah. */
export const code = (label = 'Kode') =>
	text(label, 30)
		.transform((v) => v.toUpperCase())
		.pipe(z.string().regex(/^[A-Z0-9._-]+$/, `${label} hanya boleh huruf, angka, - . _`));

/** Email wajib. */
export const email = () =>
	z
		.string({ error: 'Email wajib diisi.' })
		.trim()
		.toLowerCase()
		.min(1, 'Email wajib diisi.')
		.max(150)
		.pipe(z.email('Format email tidak valid.'));

/** Email opsional; kosong → null. */
export const optEmail = () =>
	z
		.string()
		.trim()
		.toLowerCase()
		.max(150)
		.optional()
		.transform((v) => v || null)
		.pipe(z.email('Format email tidak valid.').nullable());

/** ID referensi (select). */
export const ref = (label: string) =>
	z.coerce
		.number({ error: `${label} wajib dipilih.` })
		.int(`${label} wajib dipilih.`)
		.positive(`${label} wajib dipilih.`);

/** Angka desimal opsional (mis. koordinat); kosong → null, disimpan sebagai string. */
export const optDecimal = (min: number, max: number, label: string) =>
	z
		.string()
		.trim()
		.optional()
		.transform((v, ctx) => {
			if (!v) return null;
			const n = Number(v.replace(',', '.'));
			if (!Number.isFinite(n) || n < min || n > max) {
				ctx.addIssue({ code: 'custom', message: `${label} harus angka ${min} s.d. ${max}.` });
				return z.NEVER;
			}
			return String(n);
		});

/** Checkbox HTML: tercentang → true. */
export const checkbox = z
	.string()
	.optional()
	.transform((v) => v === 'on' || v === 'true');

export const enumOf = <T extends readonly [string, ...string[]]>(values: T, label: string) =>
	z.enum(values, { error: `${label} tidak valid.` });
