<script lang="ts">
	import { enhance } from '#lib/enhance.ts';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import DeleteButton from '#lib/components/DeleteButton.svelte';
	import GeoButton from '#lib/components/GeoButton.svelte';
	import Field from '#lib/components/Field.svelte';
	import {
		ACTIVITY_STATUS_COLOR,
		ACTIVITY_STATUS_LABEL,
		WO_STATUS_COLOR,
		WO_STATUS_LABEL
	} from '#lib/labels.ts';
	import { formatDateTime, formatDuration } from '#lib/datetime.ts';
	import { mapsUrl, s } from '#lib/utils.ts';
	import type { ActionForm } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps & { form: ActionForm } = $props();

	const act = $derived(data.activity);
	const ongoing = $derived(act.status === 'ongoing');
	const checkInMap = $derived(mapsUrl(act.checkInLat, act.checkInLng));
	const checkOutMap = $derived(mapsUrl(act.checkOutLat, act.checkOutLng));
	const coErr = $derived<Record<string, string>>(form?.checkOutErrors ?? {});
	const coValues = $derived<Record<string, unknown>>(form?.values ?? {});

	let now = $state(new Date());
	$effect(() => {
		const t = setInterval(() => (now = new Date()), 30_000);
		return () => clearInterval(t);
	});

	let lat = $state('');
	let lng = $state('');
	let uploading = $state(false);
	let result = $state<'done' | 'failed'>('done');
	let preview = $state<string | null>(null);
</script>

<PageHeader
	title="Kunjungan {data.wo.woNumber}"
	subtitle="{data.userName} · {data.wo.title}"
	back="/work-orders/{data.wo.id}"
/>

<div class="grid gap-6 xl:grid-cols-3">
	<div class="space-y-6 xl:col-span-2">
		<!-- Ringkasan -->
		<section class="card p-5">
			<div class="mb-4 flex flex-wrap items-center gap-2">
				<span class="badge {ACTIVITY_STATUS_COLOR[act.status]}">
					{ACTIVITY_STATUS_LABEL[act.status]}
				</span>
				<a href="/work-orders/{data.wo.id}" class="badge {WO_STATUS_COLOR[data.wo.status]}">
					WO: {WO_STATUS_LABEL[data.wo.status]}
				</a>
			</div>
			<dl class="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
				<div>
					<dt class="text-slate-500">Check-in</dt>
					<dd class="text-slate-800">{formatDateTime(act.checkInAt)}</dd>
					<dd class="text-xs">
						{#if checkInMap}<a href={checkInMap} target="_blank" rel="noopener" class="link"
								>Lokasi GPS</a
							>{:else}<span class="text-slate-400">Tanpa GPS</span>{/if}
					</dd>
				</div>
				<div>
					<dt class="text-slate-500">Check-out</dt>
					<dd class="text-slate-800">{formatDateTime(act.checkOutAt)}</dd>
					{#if act.checkOutAt}
						<dd class="text-xs">
							{#if checkOutMap}<a href={checkOutMap} target="_blank" rel="noopener" class="link"
									>Lokasi GPS</a
								>{:else}<span class="text-slate-400">Tanpa GPS</span>{/if}
						</dd>
					{/if}
				</div>
				<div>
					<dt class="text-slate-500">Durasi</dt>
					<dd class="text-slate-800">
						{formatDuration(act.checkInAt, act.checkOutAt ?? now)}{#if ongoing}
							<span class="text-xs text-amber-700">(berjalan)</span>{/if}
					</dd>
				</div>
				<div class="sm:col-span-3">
					<dt class="text-slate-500">Lokasi kerja</dt>
					<dd class="text-slate-800">
						{data.site.name}
						{#if data.site.address}
							<span class="text-slate-500">&middot; {data.site.address}</span>
						{/if}
					</dd>
				</div>
				{#if act.notes}
					<div class="sm:col-span-3">
						<dt class="text-slate-500">Catatan hasil kerja</dt>
						<dd class="whitespace-pre-line text-slate-800">{act.notes}</dd>
					</div>
				{/if}
			</dl>
		</section>

		<!-- Foto -->
		<section class="card p-5">
			<h2 class="mb-3 font-semibold text-slate-800">Foto dokumentasi ({data.photos.length})</h2>
			{#if form?.photoError}<p class="mb-3 alert-error">{form.photoError}</p>{/if}
			{#if form?.photosUploaded}
				<p class="mb-3 alert-success">{form.photosUploaded} foto terunggah.</p>
			{/if}

			{#if data.photos.length}
				<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
					{#each data.photos as photo (photo.id)}
						<li class="group relative overflow-hidden rounded-lg border border-slate-200">
							<button
								type="button"
								class="block w-full"
								onclick={() => (preview = `/files/${photo.filePath}`)}
							>
								<img
									src="/files/{photo.filePath}"
									alt={photo.caption ?? 'Foto kunjungan'}
									loading="lazy"
									class="aspect-square w-full object-cover"
								/>
							</button>
							<div class="flex items-center justify-between gap-1 px-2 py-1">
								<span class="truncate text-xs text-slate-600">{photo.caption ?? ''}</span>
								{#if data.editable}
									<DeleteButton
										action="?/deletePhoto"
										label="Hapus"
										small
										confirmText="Hapus foto ini?"
										fields={{ photoId: photo.id }}
									/>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm text-slate-500">Belum ada foto.</p>
			{/if}

			{#if data.editable}
				<form
					method="POST"
					action="?/uploadPhoto"
					enctype="multipart/form-data"
					class="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4"
					use:enhance={() => {
						uploading = true;
						return async ({ update }) => {
							await update();
							uploading = false;
						};
					}}
				>
					<Field label="Foto (bisa pilih beberapa, maks 10 MB/foto)" class="min-w-0 flex-1">
						<input
							type="file"
							name="photos[]"
							accept="image/jpeg,image/png,image/webp"
							multiple
							required
							class="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200"
						/>
					</Field>
					<Field label="Keterangan (opsional)" class="w-full sm:w-56">
						<input
							name="caption"
							class="input"
							maxlength="255"
							placeholder="mis. Sebelum / Sesudah"
						/>
					</Field>
					<button type="submit" class="btn-primary" disabled={uploading}>
						{uploading ? 'Mengunggah…' : 'Unggah'}
					</button>
				</form>
			{/if}
		</section>

		<!-- Material -->
		<section class="card p-5">
			<h2 class="mb-3 font-semibold text-slate-800">Material terpakai</h2>
			{#if form?.materialError}<p class="mb-3 alert-error">{form.materialError}</p>{/if}
			{#if data.usedMaterials.length}
				<div class="overflow-x-auto">
					<table class="table">
						<thead>
							<tr>
								<th>Material</th>
								<th class="text-right">Jumlah</th>
								<th>Catatan</th>
								{#if data.editable}<th></th>{/if}
							</tr>
						</thead>
						<tbody>
							{#each data.usedMaterials as m (m.id)}
								<tr>
									<td>
										{m.name} <span class="font-mono text-xs text-slate-400">{m.code}</span>
									</td>
									<td class="text-right whitespace-nowrap tabular-nums">
										{Number(m.quantity).toLocaleString('id-ID')}
										{m.unit}
									</td>
									<td>{m.notes ?? ''}</td>
									{#if data.editable}
										<td class="text-right">
											<DeleteButton
												action="?/deleteMaterial"
												label="Hapus"
												small
												confirmText="Hapus baris material ini?"
												fields={{ rowId: m.id }}
											/>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="text-sm text-slate-500">Belum ada material dicatat.</p>
			{/if}

			{#if data.editable}
				<form
					method="POST"
					action="?/addMaterial"
					use:enhance
					class="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_8rem_1fr_auto] sm:items-end"
				>
					<Field label="Material">
						<select name="materialId" class="input" required>
							<option value="">— Pilih —</option>
							{#each data.materialOptions as m (m.id)}
								<option value={String(m.id)}>{m.name} ({m.unit})</option>
							{/each}
						</select>
					</Field>
					<Field label="Jumlah">
						<input
							name="quantity"
							type="number"
							step="0.01"
							min="0.01"
							class="input"
							inputmode="decimal"
							required
						/>
					</Field>
					<Field label="Catatan">
						<input name="notes" class="input" maxlength="255" />
					</Field>
					<button type="submit" class="btn-secondary">Tambah</button>
				</form>
			{/if}
		</section>
	</div>

	<!-- Check-out -->
	<div>
		{#if ongoing && data.isOwner}
			<section class="card border-amber-300 p-5">
				<h2 class="font-semibold text-slate-800">Check-out</h2>
				<p class="mt-1 text-sm text-slate-500">
					Lakukan setelah pekerjaan di lokasi selesai. Pastikan foto & material sudah dicatat.
				</p>
				{#if form?.checkOutError}<p class="mt-3 alert-error">{form.checkOutError}</p>{/if}

				<form method="POST" action="?/checkOut" use:enhance class="mt-4 space-y-4">
					<fieldset>
						<legend class="mb-1 text-sm font-medium text-slate-700">Hasil kunjungan</legend>
						<div class="flex gap-4 text-sm">
							<label class="flex items-center gap-1.5">
								<input type="radio" name="status" value="done" bind:group={result} />
								Selesai
							</label>
							<label class="flex items-center gap-1.5">
								<input type="radio" name="status" value="failed" bind:group={result} />
								Gagal / tertunda
							</label>
						</div>
					</fieldset>

					<Field
						label="Catatan hasil kerja"
						required={result === 'failed'}
						error={coErr.notes}
						hint="Apa yang dikerjakan, temuan, kendala."
					>
						<textarea name="notes" rows="4" class="input">{s(coValues.notes)}</textarea>
					</Field>

					{#if data.canCompleteWo && result === 'done'}
						<label class="flex items-start gap-2 text-sm text-slate-700">
							<input type="checkbox" name="completeWo" class="mt-0.5 rounded border-slate-300" />
							Tandai work order {data.wo.woNumber} selesai
						</label>
					{/if}

					<input type="hidden" name="lat" value={lat} />
					<input type="hidden" name="lng" value={lng} />
					<div class="flex flex-wrap items-center gap-2">
						<GeoButton
							onlocate={(a, b) => {
								lat = a;
								lng = b;
							}}
						/>
						{#if lat}<span class="text-xs text-green-700">✓ GPS tercatat</span>{/if}
					</div>

					<button
						type="submit"
						class="btn-primary w-full"
						onclick={(e) => {
							if (!confirm('Check-out sekarang? Setelah ini kunjungan tidak bisa diubah.'))
								e.preventDefault();
						}}
					>
						Check-out
					</button>
				</form>
			</section>
		{:else if form?.checkedOut}
			<p class="alert-success">Check-out berhasil. Terima kasih!</p>
		{/if}
	</div>
</div>

<!-- Pratinjau foto -->
{#if preview}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
		role="dialog"
		aria-modal="true"
		aria-label="Pratinjau foto"
	>
		<button
			type="button"
			class="absolute inset-0 cursor-zoom-out"
			aria-label="Tutup pratinjau"
			onclick={() => (preview = null)}
		></button>
		<img src={preview} alt="Pratinjau" class="relative max-h-full max-w-full rounded shadow-lg" />
	</div>
{/if}

<svelte:window onkeydown={(e) => e.key === 'Escape' && (preview = null)} />
