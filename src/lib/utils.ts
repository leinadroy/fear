/** Ubah nilai apa pun jadi string untuk atribut `value` input (null → ''). */
export function s(value: unknown): string {
	return value == null ? '' : String(value);
}

/** Link Google Maps untuk koordinat, atau null jika kosong. */
export function mapsUrl(lat: unknown, lng: unknown): string | null {
	if (lat == null || lng == null || lat === '' || lng === '') return null;
	return `https://www.google.com/maps?q=${lat},${lng}`;
}
