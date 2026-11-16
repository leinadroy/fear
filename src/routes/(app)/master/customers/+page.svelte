<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SearchBar from '#lib/components/SearchBar.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageHeader title="Pelanggan" subtitle="Daftar pelanggan pemilik lokasi kerja.">
	{#snippet actions()}
		<a href="/master/customers/new" class="btn-primary">+ Tambah pelanggan</a>
	{/snippet}
</PageHeader>

<SearchBar q={data.q} placeholder="Cari kode, nama, kontak…" />

<div class="table-wrap">
	<table class="table">
		<thead>
			<tr>
				<th>Kode</th>
				<th>Nama</th>
				<th>Kontak</th>
				<th>Telepon</th>
				<th class="text-right">Lokasi</th>
			</tr>
		</thead>
		<tbody>
			{#each data.items as c (c.id)}
				<tr>
					<td class="font-mono text-xs">{c.code}</td>
					<td><a href="/master/customers/{c.id}" class="link">{c.name}</a></td>
					<td>{c.contactPerson ?? '—'}</td>
					<td>{c.phone ?? '—'}</td>
					<td class="text-right tabular-nums">
						<a href="/master/sites?customer={c.id}" class="link">{c.siteCount}</a>
					</td>
				</tr>
			{:else}
				<tr><td colspan="5" class="py-8 text-center text-slate-500">Belum ada pelanggan.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
