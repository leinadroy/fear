<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Field from '#lib/components/Field.svelte';
	import DeleteButton from '#lib/components/DeleteButton.svelte';
	import { s } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const v = $derived<Record<string, unknown>>(form?.values ?? data.item ?? { isActive: true });
	const err = $derived<Record<string, string>>(form?.errors ?? {});
	// Checkbox: dari DB berupa boolean, dari form gagal berupa 'on' (atau tidak ada).
	const active = $derived(form?.values ? v.isActive === 'on' : v.isActive !== false);
</script>

<PageHeader
	title={data.item ? data.item.name : 'Jenis aktivitas baru'}
	back="/master/activity-types"
/>

{#if form?.message}<p class="mb-4 alert-error">{form.message}</p>{/if}

<form method="POST" action="?/save" use:enhance class="max-w-2xl space-y-4 card p-6">
	<div class="grid gap-4 sm:grid-cols-3">
		<Field label="Kode" required error={err.code}>
			<input name="code" value={s(v.code)} class="input uppercase" maxlength="30" required />
		</Field>
		<Field label="Nama" required error={err.name} class="sm:col-span-2">
			<input name="name" value={s(v.name)} class="input" maxlength="100" required />
		</Field>
	</div>
	<Field label="Keterangan" error={err.description}>
		<textarea name="description" rows="3" class="input">{s(v.description)}</textarea>
	</Field>
	<label class="flex items-center gap-2 text-sm text-slate-700">
		<input type="checkbox" name="isActive" checked={active} class="rounded border-slate-300" />
		Aktif (bisa dipilih saat membuat work order)
	</label>

	<div class="flex justify-end gap-2 pt-2">
		<a href="/master/activity-types" class="btn-secondary">Batal</a>
		<button type="submit" class="btn-primary">Simpan</button>
	</div>
</form>

{#if data.item}
	<div class="mt-6 max-w-2xl">
		<DeleteButton label="Hapus jenis aktivitas" />
	</div>
{/if}
