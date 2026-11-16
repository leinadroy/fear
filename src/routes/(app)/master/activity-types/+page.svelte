<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageHeader title="Jenis Aktivitas" subtitle="Kategori pekerjaan untuk work order.">
	{#snippet actions()}
		<a href="/master/activity-types/new" class="btn-primary">+ Tambah jenis</a>
	{/snippet}
</PageHeader>

<div class="table-wrap">
	<table class="table">
		<thead>
			<tr>
				<th>Kode</th>
				<th>Nama</th>
				<th>Keterangan</th>
				<th>Status</th>
			</tr>
		</thead>
		<tbody>
			{#each data.items as t (t.id)}
				<tr>
					<td class="font-mono text-xs">{t.code}</td>
					<td><a href="/master/activity-types/{t.id}" class="link">{t.name}</a></td>
					<td>{t.description ?? '—'}</td>
					<td>
						<span
							class="badge {t.isActive
								? 'bg-green-100 text-green-700'
								: 'bg-slate-100 text-slate-500'}">{t.isActive ? 'Aktif' : 'Nonaktif'}</span
						>
					</td>
				</tr>
			{:else}
				<tr><td colspan="4" class="py-8 text-center text-slate-500">Belum ada data.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
