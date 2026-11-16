<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SearchBar from '#lib/components/SearchBar.svelte';
	import { ACTIVITY_STATUS_COLOR, ACTIVITY_STATUS_LABEL } from '#lib/labels.ts';
	import { ACTIVITY_STATUSES } from '#lib/enums.ts';
	import { formatDateTime, formatDuration } from '#lib/datetime.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageHeader
	title="Aktivitas Lapangan"
	subtitle={data.manager
		? 'Semua kunjungan (check-in / check-out) petugas.'
		: 'Riwayat kunjungan Anda. Check-in dilakukan dari halaman work order.'}
/>

<SearchBar q={data.q} placeholder="No. WO, judul, petugas, lokasi…">
	<select name="status" class="input max-w-[10rem]" value={data.status}>
		<option value="">Semua status</option>
		{#each ACTIVITY_STATUSES as st (st)}
			<option value={st}>{ACTIVITY_STATUS_LABEL[st]}</option>
		{/each}
	</select>
</SearchBar>

<div class="table-wrap">
	<table class="table">
		<thead>
			<tr>
				<th>Check-in</th>
				<th>Petugas</th>
				<th>Work order</th>
				<th>Lokasi</th>
				<th>Durasi</th>
				<th>Foto</th>
				<th>Status</th>
			</tr>
		</thead>
		<tbody>
			{#each data.items as act (act.id)}
				<tr>
					<td class="whitespace-nowrap">
						<a href="/activities/{act.id}" class="link">{formatDateTime(act.checkInAt)}</a>
					</td>
					<td>{act.userName}</td>
					<td>
						<a
							href="/work-orders/{act.woId}"
							class="font-mono text-xs text-slate-500 hover:underline">{act.woNumber}</a
						>
						<div class="max-w-[16rem] truncate">{act.woTitle}</div>
					</td>
					<td>{act.siteName}</td>
					<td class="whitespace-nowrap">{formatDuration(act.checkInAt, act.checkOutAt)}</td>
					<td class="tabular-nums">{act.photoCount}</td>
					<td>
						<span class="badge {ACTIVITY_STATUS_COLOR[act.status]}">
							{ACTIVITY_STATUS_LABEL[act.status]}
						</span>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="7" class="py-8 text-center text-slate-500">Belum ada kunjungan.</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
