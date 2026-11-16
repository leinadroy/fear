<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SearchBar from '#lib/components/SearchBar.svelte';
	import { PRIORITY_COLOR, PRIORITY_LABEL, WO_STATUS_COLOR, WO_STATUS_LABEL } from '#lib/labels.ts';
	import { WO_PRIORITIES, WO_STATUSES } from '#lib/enums.ts';
	import { formatDateTime } from '#lib/datetime.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageHeader
	title="Work Order"
	subtitle={data.manager ? 'Semua pekerjaan lapangan.' : 'Pekerjaan yang ditugaskan ke Anda.'}
>
	{#snippet actions()}
		{#if data.manager}
			<a href="/work-orders/new" class="btn-primary">+ Work Order baru</a>
		{/if}
	{/snippet}
</PageHeader>

<SearchBar q={data.q} placeholder="No. WO, judul, lokasi, pelanggan…">
	<select name="status" class="input max-w-[11rem]" value={data.status}>
		<option value="">Semua status</option>
		<option value="open">Terbuka (belum selesai)</option>
		{#each WO_STATUSES as st (st)}
			<option value={st}>{WO_STATUS_LABEL[st]}</option>
		{/each}
	</select>
	<select name="priority" class="input max-w-[10rem]" value={data.priority}>
		<option value="">Semua prioritas</option>
		{#each WO_PRIORITIES as p (p)}
			<option value={p}>{PRIORITY_LABEL[p]}</option>
		{/each}
	</select>
</SearchBar>

<div class="table-wrap">
	<table class="table">
		<thead>
			<tr>
				<th>No. WO</th>
				<th>Pekerjaan</th>
				<th>Lokasi</th>
				<th>Petugas</th>
				<th>Jadwal</th>
				<th>Prioritas</th>
				<th>Status</th>
			</tr>
		</thead>
		<tbody>
			{#each data.items as wo (wo.id)}
				<tr>
					<td class="font-mono text-xs whitespace-nowrap">
						<a href="/work-orders/{wo.id}" class="link">{wo.woNumber}</a>
					</td>
					<td>
						<a href="/work-orders/{wo.id}" class="font-medium text-slate-800 hover:underline"
							>{wo.title}</a
						>
						<div class="text-xs text-slate-500">{wo.typeName}</div>
					</td>
					<td>
						{wo.siteName}
						<div class="text-xs text-slate-500">{wo.customerName}</div>
					</td>
					<td class="max-w-[14rem] text-xs">{wo.assignees ?? '—'}</td>
					<td class="text-xs whitespace-nowrap">{formatDateTime(wo.scheduledStart)}</td>
					<td
						><span class="badge {PRIORITY_COLOR[wo.priority]}">{PRIORITY_LABEL[wo.priority]}</span
						></td
					>
					<td
						><span class="badge {WO_STATUS_COLOR[wo.status]}">{WO_STATUS_LABEL[wo.status]}</span
						></td
					>
				</tr>
			{:else}
				<tr>
					<td colspan="7" class="py-8 text-center text-slate-500">Tidak ada work order.</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
