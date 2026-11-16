<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SearchBar from '#lib/components/SearchBar.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageHeader title="Material" subtitle="Daftar material yang dipakai di lapangan.">
	{#snippet actions()}
		<a href="/master/materials/new" class="btn-primary">+ Tambah material</a>
	{/snippet}
</PageHeader>

<SearchBar q={data.q} placeholder="Cari kode atau nama…" />

<div class="table-wrap">
	<table class="table">
		<thead>
			<tr>
				<th>Kode</th>
				<th>Nama</th>
				<th>Satuan</th>
			</tr>
		</thead>
		<tbody>
			{#each data.items as m (m.id)}
				<tr>
					<td class="font-mono text-xs">{m.code}</td>
					<td><a href="/master/materials/{m.id}" class="link">{m.name}</a></td>
					<td>{m.unit}</td>
				</tr>
			{:else}
				<tr><td colspan="3" class="py-8 text-center text-slate-500">Belum ada material.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
