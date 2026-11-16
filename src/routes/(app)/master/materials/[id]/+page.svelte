<script lang="ts">
	import { enhance } from '#lib/enhance.ts';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Field from '#lib/components/Field.svelte';
	import DeleteButton from '#lib/components/DeleteButton.svelte';
	import { s } from '#lib/utils.ts';
	import type { ActionForm } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps & { form: ActionForm } = $props();

	const v = $derived<Record<string, unknown>>(form?.values ?? data.item ?? {});
	const err = $derived<Record<string, string>>(form?.errors ?? {});
</script>

<PageHeader title={data.item ? data.item.name : 'Material baru'} back="/master/materials" />

{#if form?.message}<p class="mb-4 alert-error">{form.message}</p>{/if}

<form method="POST" action="?/save" use:enhance class="max-w-2xl space-y-4 card p-6">
	<div class="grid gap-4 sm:grid-cols-4">
		<Field label="Kode" required error={err.code}>
			<input name="code" value={s(v.code)} class="input uppercase" maxlength="30" required />
		</Field>
		<Field label="Nama material" required error={err.name} class="sm:col-span-2">
			<input name="name" value={s(v.name)} class="input" maxlength="150" required />
		</Field>
		<Field label="Satuan" required error={err.unit} hint="meter, pcs, roll…">
			<input name="unit" value={s(v.unit)} class="input" maxlength="20" required />
		</Field>
	</div>

	<div class="flex justify-end gap-2 pt-2">
		<a href="/master/materials" class="btn-secondary">Batal</a>
		<button type="submit" class="btn-primary">Simpan</button>
	</div>
</form>

{#if data.item}
	<div class="mt-6 max-w-2xl">
		<DeleteButton label="Hapus material" />
	</div>
{/if}
