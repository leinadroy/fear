<script lang="ts">
	import { enhance } from '#lib/enhance.ts';
	import Field from './Field.svelte';
	import { PRIORITY_LABEL } from '../labels';
	import { WO_PRIORITIES } from '../enums';
	import { toInputDateTime } from '../datetime';
	import { s } from '../utils';

	type SiteOption = { id: number; name: string; code: string; customerName: string };
	type TypeOption = { id: number; name: string };

	let {
		values,
		errors,
		siteOptions,
		typeOptions,
		cancelHref
	}: {
		values: Record<string, unknown>;
		errors: Record<string, string>;
		siteOptions: SiteOption[];
		typeOptions: TypeOption[];
		cancelHref: string;
	} = $props();

	// Kelompokkan lokasi per pelanggan untuk <optgroup>.
	const sitesByCustomer = $derived(
		Object.entries(
			siteOptions.reduce<Record<string, SiteOption[]>>((acc, site) => {
				(acc[site.customerName] ??= []).push(site);
				return acc;
			}, {})
		)
	);
</script>

{#if siteOptions.length === 0}
	<p class="mb-4 max-w-3xl alert-error">
		Belum ada lokasi. <a href="/master/sites/new" class="link">Tambah lokasi</a> dulu.
	</p>
{/if}

<form method="POST" use:enhance class="max-w-3xl space-y-4 card p-6">
	<Field label="Judul pekerjaan" required error={errors.title}>
		<input name="title" value={s(values.title)} class="input" maxlength="200" required />
	</Field>

	<div class="grid gap-4 sm:grid-cols-2">
		<Field label="Lokasi" required error={errors.siteId}>
			<select name="siteId" class="input" value={s(values.siteId)} required>
				<option value="">— Pilih lokasi —</option>
				{#each sitesByCustomer as [customer, list] (customer)}
					<optgroup label={customer}>
						{#each list as site (site.id)}
							<option value={String(site.id)}>{site.name} ({site.code})</option>
						{/each}
					</optgroup>
				{/each}
			</select>
		</Field>
		<Field label="Jenis aktivitas" required error={errors.activityTypeId}>
			<select name="activityTypeId" class="input" value={s(values.activityTypeId)} required>
				<option value="">— Pilih jenis —</option>
				{#each typeOptions as t (t.id)}
					<option value={String(t.id)}>{t.name}</option>
				{/each}
			</select>
		</Field>
	</div>

	<div class="grid gap-4 sm:grid-cols-3">
		<Field label="Prioritas" required error={errors.priority}>
			<select name="priority" class="input" value={s(values.priority) || 'medium'}>
				{#each WO_PRIORITIES as p (p)}
					<option value={p}>{PRIORITY_LABEL[p]}</option>
				{/each}
			</select>
		</Field>
		<Field label="Jadwal mulai (WIB)" error={errors.scheduledStart}>
			<input
				name="scheduledStart"
				type="datetime-local"
				value={toInputDateTime(values.scheduledStart)}
				class="input"
			/>
		</Field>
		<Field label="Jadwal selesai (WIB)" error={errors.scheduledEnd}>
			<input
				name="scheduledEnd"
				type="datetime-local"
				value={toInputDateTime(values.scheduledEnd)}
				class="input"
			/>
		</Field>
	</div>

	<Field label="Deskripsi / instruksi kerja" error={errors.description}>
		<textarea name="description" rows="5" class="input">{s(values.description)}</textarea>
	</Field>

	<div class="flex justify-end gap-2 pt-2">
		<a href={cancelHref} class="btn-secondary">Batal</a>
		<button type="submit" class="btn-primary">Simpan</button>
	</div>
</form>
