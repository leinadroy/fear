<script lang="ts">
	/**
	 * Tombol "Ambil lokasi saya": mengisi koordinat dari GPS perangkat.
	 * Browser hanya mengizinkan geolocation di HTTPS atau localhost.
	 */
	let {
		onlocate,
		label = 'Ambil lokasi saya'
	}: { onlocate: (lat: string, lng: string) => void; label?: string } = $props();

	let busy = $state(false);
	let message = $state('');

	function locate() {
		if (!('geolocation' in navigator)) {
			message = 'Perangkat tidak mendukung GPS.';
			return;
		}
		busy = true;
		message = '';
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				busy = false;
				onlocate(pos.coords.latitude.toFixed(7), pos.coords.longitude.toFixed(7));
				message = `Akurasi ±${Math.round(pos.coords.accuracy)} m`;
			},
			(err) => {
				busy = false;
				message =
					err.code === err.PERMISSION_DENIED
						? 'Izin lokasi ditolak browser.'
						: 'Gagal mengambil lokasi.';
			},
			{ enableHighAccuracy: true, timeout: 15000 }
		);
	}
</script>

<span class="inline-flex flex-wrap items-center gap-2">
	<button type="button" class="btn-secondary btn-sm" onclick={locate} disabled={busy}>
		{busy ? 'Mencari lokasi…' : label}
	</button>
	{#if message}<span class="text-xs text-slate-500">{message}</span>{/if}
</span>
