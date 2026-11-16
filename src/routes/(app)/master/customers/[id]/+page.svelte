<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Field from '#lib/components/Field.svelte';
	import DeleteButton from '#lib/components/DeleteButton.svelte';
	import { s } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const v = $derived<Record<string, unknown>>(form?.values ?? data.item ?? {});
	const err = $derived<Record<string, string>>(form?.errors ?? {});
</script>

<PageHeader title={data.item ? data.item.name : 'Pelanggan baru'} back="/master/customers" />

{#if form?.message}<p class="mb-4 alert-error">{form.message}</p>{/if}

<form method="POST" action="?/save" use:enhance class="max-w-2xl space-y-4 card p-6">
	<div class="grid gap-4 sm:grid-cols-3">
		<Field label="Kode" required error={err.code}>
			<input name="code" value={s(v.code)} class="input uppercase" maxlength="30" required />
		</Field>
		<Field label="Nama pelanggan" required error={err.name} class="sm:col-span-2">
			<input name="name" value={s(v.name)} class="input" maxlength="150" required />
		</Field>
	</div>
	<div class="grid gap-4 sm:grid-cols-3">
		<Field label="Kontak (PIC)" error={err.contactPerson}>
			<input name="contactPerson" value={s(v.contactPerson)} class="input" maxlength="100" />
		</Field>
		<Field label="Telepon" error={err.phone}>
			<input name="phone" type="tel" value={s(v.phone)} class="input" maxlength="30" />
		</Field>
		<Field label="Email" error={err.email}>
			<input name="email" type="email" value={s(v.email)} class="input" maxlength="150" />
		</Field>
	</div>
	<Field label="Alamat" error={err.address}>
		<textarea name="address" rows="3" class="input">{s(v.address)}</textarea>
	</Field>

	<div class="flex justify-end gap-2 pt-2">
		<a href="/master/customers" class="btn-secondary">Batal</a>
		<button type="submit" class="btn-primary">Simpan</button>
	</div>
</form>

{#if data.item}
	<div class="mt-6 max-w-2xl">
		<DeleteButton label="Hapus pelanggan" />
	</div>
{/if}
