<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import DeleteButton from '#lib/components/DeleteButton.svelte';
	import GeoButton from '#lib/components/GeoButton.svelte';
	import {
		ACTIVITY_STATUS_COLOR,
		ACTIVITY_STATUS_LABEL,
		ASSIGNEE_ROLE_LABEL,
		PRIORITY_COLOR,
		PRIORITY_LABEL,
		ROLE_LABEL,
		WO_STATUS_COLOR,
		WO_STATUS_LABEL
	} from '#lib/labels.ts';
	import { WO_STATUSES } from '#lib/enums.ts';
	import { formatDateTime, formatDuration } from '#lib/datetime.ts';
	import { mapsUrl } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const wo = $derived(data.wo);
	const siteMap = $derived(mapsUrl(data.site.latitude, data.site.longitude));

	let lat = $state('');
	let lng = $state('');
	let checkingIn = $state(false);
</script>

<PageHeader title={wo.title} subtitle="{wo.woNumber} · {data.typeName}" back="/work-orders">
	{#snippet actions()}
		{#if data.manager}
			<a href="/work-orders/{wo.id}/edit" class="btn-secondary">Edit</a>
		{/if}
	{/snippet}
</PageHeader>

{#if form?.message}<p class="mb-4 alert-error">{form.message}</p>{/if}

<div class="grid gap-6 xl:grid-cols-3">
	<div class="space-y-6 xl:col-span-2">
		<!-- Ringkasan -->
		<section class="card p-5">
			<div class="mb-4 flex flex-wrap gap-2">
				<span class="badge {WO_STATUS_COLOR[wo.status]}">{WO_STATUS_LABEL[wo.status]}</span>
				<span class="badge {PRIORITY_COLOR[wo.priority]}">
					Prioritas {PRIORITY_LABEL[wo.priority]}
				</span>
			</div>
			<dl class="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
				<div>
					<dt class="text-slate-500">Pelanggan</dt>
					<dd class="font-medium text-slate-800">
						{data.customer.name}
						{#if data.customer.phone}<span class="font-normal text-slate-500">
								· {data.customer.phone}</span
							>{/if}
					</dd>
				</div>
				<div>
					<dt class="text-slate-500">Lokasi</dt>
					<dd class="font-medium text-slate-800">
						{data.site.name}
						{#if siteMap}<a href={siteMap} target="_blank" rel="noopener" class="ml-1 text-xs link"
								>Peta</a
							>{/if}
					</dd>
					{#if data.site.address}<dd class="text-xs text-slate-500">{data.site.address}</dd>{/if}
				</div>
				<div>
					<dt class="text-slate-500">Jadwal</dt>
					<dd class="text-slate-800">
						{formatDateTime(wo.scheduledStart)} — {formatDateTime(wo.scheduledEnd)}
					</dd>
				</div>
				<div>
					<dt class="text-slate-500">Dibuat</dt>
					<dd class="text-slate-800">{formatDateTime(wo.createdAt)} oleh {data.creatorName}</dd>
				</div>
				{#if wo.completedAt}
					<div>
						<dt class="text-slate-500">Selesai</dt>
						<dd class="text-slate-800">{formatDateTime(wo.completedAt)}</dd>
					</div>
				{/if}
			</dl>
			{#if wo.description}
				<div class="mt-4 border-t border-slate-100 pt-4">
					<div class="mb-1 text-sm text-slate-500">Instruksi kerja</div>
					<p class="text-sm whitespace-pre-line text-slate-800">{wo.description}</p>
				</div>
			{/if}
		</section>

		<!-- Check-in -->
		{#if data.myOngoing}
			<section class="card border-amber-300 bg-amber-50 p-5">
				<p class="text-sm text-amber-900">
					Anda sedang check-in{data.myOngoing.workOrderId === wo.id ? ' di WO ini' : ' di WO lain'}.
				</p>
				<a href="/activities/{data.myOngoing.id}" class="mt-3 btn-primary">
					Buka kunjungan & check-out
				</a>
			</section>
		{:else if data.canCheckIn}
			<section class="card p-5">
				<h2 class="font-semibold text-slate-800">Mulai kunjungan</h2>
				<p class="mt-1 text-sm text-slate-500">
					Check-in saat tiba di lokasi. Lokasi GPS dicatat sebagai bukti kehadiran (opsional).
				</p>
				{#if form?.checkInError}<p class="mt-3 alert-error">{form.checkInError}</p>{/if}
				<form
					method="POST"
					action="?/checkIn"
					class="mt-4 flex flex-wrap items-center gap-3"
					use:enhance={() => {
						checkingIn = true;
						return async ({ update }) => {
							await update();
							checkingIn = false;
						};
					}}
				>
					<input type="hidden" name="lat" value={lat} />
					<input type="hidden" name="lng" value={lng} />
					<GeoButton
						onlocate={(a, b) => {
							lat = a;
							lng = b;
						}}
					/>
					{#if lat}<span class="text-xs text-green-700">✓ {lat}, {lng}</span>{/if}
					<button type="submit" class="btn-primary" disabled={checkingIn}>
						{checkingIn ? 'Memproses…' : 'Check-in sekarang'}
					</button>
				</form>
			</section>
		{/if}

		<!-- Riwayat kunjungan -->
		<section class="card">
			<div class="border-b border-slate-100 px-5 py-3">
				<h2 class="font-semibold text-slate-800">Riwayat kunjungan</h2>
			</div>
			{#if data.activities.length === 0}
				<p class="px-5 py-6 text-center text-sm text-slate-500">Belum ada kunjungan.</p>
			{:else}
				<ul class="divide-y divide-slate-100">
					{#each data.activities as act (act.id)}
						<li>
							<a href="/activities/{act.id}" class="block px-5 py-3 hover:bg-slate-50">
								<div class="flex flex-wrap items-center gap-2">
									<span class="font-medium text-slate-800">{act.userName}</span>
									<span class="badge {ACTIVITY_STATUS_COLOR[act.status]}">
										{ACTIVITY_STATUS_LABEL[act.status]}
									</span>
									{#if act.photoCount}<span class="text-xs text-slate-500"
											>{act.photoCount} foto</span
										>{/if}
								</div>
								<div class="text-xs text-slate-500">
									{formatDateTime(act.checkInAt)} → {formatDateTime(act.checkOutAt)}
									{#if act.checkOutAt}({formatDuration(act.checkInAt, act.checkOutAt)}){/if}
								</div>
								{#if act.notes}
									<p class="mt-1 line-clamp-2 text-sm text-slate-600">{act.notes}</p>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>

	<div class="space-y-6">
		<!-- Petugas -->
		<section class="card p-5">
			<h2 class="mb-3 font-semibold text-slate-800">Petugas</h2>
			{#if data.assignees.length === 0}
				<p class="text-sm text-slate-500">Belum ada petugas.</p>
			{:else}
				<ul class="space-y-2">
					{#each data.assignees as a (a.userId)}
						<li class="flex items-start justify-between gap-2">
							<div>
								<div class="text-sm font-medium text-slate-800">{a.name}</div>
								<div class="text-xs text-slate-500">
									{ASSIGNEE_ROLE_LABEL[a.role]}{#if a.phone}
										· {a.phone}{/if}
								</div>
							</div>
							{#if data.manager}
								<DeleteButton
									action="?/unassign"
									label="Lepas"
									small
									confirmText="Lepas {a.name} dari WO ini?"
									fields={{ userId: a.userId }}
								/>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}

			{#if data.manager}
				<form
					method="POST"
					action="?/assign"
					use:enhance
					class="mt-4 space-y-2 border-t border-slate-100 pt-4"
				>
					{#if form?.assignError}<p class="text-xs text-red-600">{form.assignError}</p>{/if}
					{#if data.candidates.length}
						<select name="userId" class="input" required>
							<option value="">— Tambah petugas —</option>
							{#each data.candidates as c (c.id)}
								<option value={String(c.id)}>{c.name} ({ROLE_LABEL[c.role]})</option>
							{/each}
						</select>
						<div class="flex gap-2">
							<select name="role" class="input">
								<option value="member">Anggota</option>
								<option value="lead">Ketua tim</option>
							</select>
							<button type="submit" class="btn-primary">Tambah</button>
						</div>
					{:else}
						<p class="text-xs text-slate-500">
							Tidak ada engineer aktif lain. <a href="/users/new" class="link">Tambah pengguna</a>
						</p>
					{/if}
				</form>
			{/if}
		</section>

		{#if data.manager}
			<!-- Status -->
			<section class="card p-5">
				<h2 class="mb-3 font-semibold text-slate-800">Ubah status</h2>
				{#if form?.statusSaved}<p class="mb-3 alert-success">Status diperbarui.</p>{/if}
				<form method="POST" action="?/status" use:enhance class="flex gap-2">
					<select name="status" class="input" value={wo.status}>
						{#each WO_STATUSES as st (st)}
							<option value={st}>{WO_STATUS_LABEL[st]}</option>
						{/each}
					</select>
					<button type="submit" class="btn-secondary">Simpan</button>
				</form>
			</section>

			{#if data.activities.length === 0}
				<DeleteButton
					label="Hapus work order"
					confirmText="Hapus {wo.woNumber}? Tindakan ini tidak bisa dibatalkan."
				/>
			{/if}
		{/if}
	</div>
</div>
