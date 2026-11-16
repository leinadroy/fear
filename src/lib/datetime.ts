/** Semua waktu disimpan UTC di database dan ditampilkan dalam WIB. */
export const APP_TIME_ZONE = 'Asia/Jakarta';
const APP_UTC_OFFSET = '+07:00';

const dateTimeFmt = new Intl.DateTimeFormat('id-ID', {
	timeZone: APP_TIME_ZONE,
	dateStyle: 'medium',
	timeStyle: 'short'
});
const dateFmt = new Intl.DateTimeFormat('id-ID', { timeZone: APP_TIME_ZONE, dateStyle: 'medium' });
const partsFmt = new Intl.DateTimeFormat('en-CA', {
	timeZone: APP_TIME_ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23'
});

export function formatDateTime(d: Date | null | undefined): string {
	return d ? dateTimeFmt.format(d) : '—';
}

export function formatDate(d: Date | null | undefined): string {
	return d ? dateFmt.format(d) : '—';
}

/** Durasi antara dua waktu, mis. "2 j 15 m". */
export function formatDuration(from: Date, to: Date | null | undefined): string {
	if (!to) return '—';
	const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return h ? `${h} j ${m} m` : `${m} m`;
}

/** Date → nilai untuk <input type="datetime-local"> dalam WIB. String dibiarkan apa adanya. */
export function toInputDateTime(value: unknown): string {
	if (typeof value === 'string') return value;
	if (!(value instanceof Date)) return '';
	const p = Object.fromEntries(partsFmt.formatToParts(value).map((x) => [x.type, x.value]));
	return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Nilai <input type="datetime-local"> (WIB) → Date. */
export function fromInputDateTime(value: string): Date | null {
	if (!value) return null;
	const d = new Date(`${value.length === 16 ? value + ':00' : value}${APP_UTC_OFFSET}`);
	return Number.isNaN(d.getTime()) ? null : d;
}

/** Awal hari ini (00:00 WIB) sebagai Date. */
export function startOfTodayWib(now = new Date()): Date {
	const day = toInputDateTime(now).slice(0, 10);
	return new Date(`${day}T00:00:00${APP_UTC_OFFSET}`);
}
