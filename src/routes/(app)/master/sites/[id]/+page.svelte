<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Field from '#lib/components/Field.svelte';
	import DeleteButton from '#lib/components/DeleteButton.svelte';
	import GeoButton from '#lib/components/GeoButton.svelte';
	import { mapsUrl, s } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const v = $derived<Record<string, unknown>>(form?.values ?? data.item ?? {});
	const err = $derived<Record<string, string>>(form?.errors ?? {});

	// Koordinat bisa diisi manual atau dari GPS.
	let lat = $derived(s(v.latitude));
	let lng = $derived(s(v.longitude));
	const map = $derived(mapsUrl(lat, lng));
</script>

<PageHeader
	title={!data.isNew && data.item && 'name' in data.item ? data.item.name : 'Lokasi baru'}
	back="/master/sites"
/>

{#if form?.message}<p class="mb-4 alert-error">{form.message}</p>{/if}

{#if data.customerOptions.length === 0}
	<p class="mb-4 alert-error">
		Belum ada pelanggan. <a href="/master/customers/new" class="link">Tambah pelanggan</a> dulu.
	</p>
{/if}

<form method="POST" action="?/save" use:enhance class="max-w-2xl space-y-4 card p-6">
	<Field label="Pelanggan" required error={err.customerId}>
		<select name="customerId" class="input" value={s(v.customerId)} required>
			<option value="">— Pilih pelanggan —</option>
			{#each data.customerOptions as c (c.id)}
				<option value={String(c.id)}>{c.name}</option>
			{/each}
		</select>
	</Field>
	<div class="grid gap-4 sm:grid-cols-3">
		<Field label="Kode" required error={err.code}>
			<input name="code" value={s(v.code)} class="input uppercase" maxlength="30" required />
		</Field>
		<Field label="Nama lokasi" required error={err.name} class="sm:col-span-2">
			<input name="name" value={s(v.name)} class="input" maxlength="150" required />
		</Field>
	</div>
	<Field label="Alamat" error={err.address}>
		<textarea name="address" rows="3" class="input">{s(v.address)}</textarea>
	</Field>
	<div class="grid gap-4 sm:grid-cols-2">
		<Field label="Latitude" error={err.latitude} hint="Contoh: -6.2000000">
			<input name="latitude" bind:value={lat} class="input" inputmode="decimal" />
		</Field>
		<Field label="Longitude" error={err.longitude} hint="Contoh: 106.8166667">
			<input name="longitude" bind:value={lng} class="input" inputmode="decimal" />
		</Field>
	</div>
	<div class="flex flex-wrap items-center gap-3">
		<GeoButton
			label="Isi dari lokasi saya sekarang"
			onlocate={(a, b) => {
				lat = a;
				lng = b;
			}}
		/>
		{#if map}<a href={map} target="_blank" rel="noopener" class="text-sm link"
				>Lihat di Google Maps</a
			>{/if}
	</div>

	<div class="flex justify-end gap-2 pt-2">
		<a href="/master/sites" class="btn-secondary">Batal</a>
		<button type="submit" class="btn-primary">Simpan</button>
	</div>
</form>

{#if !data.isNew}
	<div class="mt-6 max-w-2xl">
		<DeleteButton label="Hapus lokasi" />
	</div>
{/if}
