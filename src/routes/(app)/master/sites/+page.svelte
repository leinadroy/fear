<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SearchBar from '#lib/components/SearchBar.svelte';
	import { mapsUrl } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageHeader title="Lokasi" subtitle="Lokasi kerja (site) milik pelanggan.">
	{#snippet actions()}
		<a
			href="/master/sites/new{data.customerId ? `?customer=${data.customerId}` : ''}"
			class="btn-primary">+ Tambah lokasi</a
		>
	{/snippet}
</PageHeader>

<SearchBar q={data.q} placeholder="Cari kode, nama, alamat…">
	<select name="customer" class="input max-w-xs" value={data.customerId ?? ''}>
		<option value="">Semua pelanggan</option>
		{#each data.customerOptions as c (c.id)}
			<option value={c.id}>{c.name}</option>
		{/each}
	</select>
</SearchBar>

<div class="table-wrap">
	<table class="table">
		<thead>
			<tr>
				<th>Kode</th>
				<th>Nama lokasi</th>
				<th>Pelanggan</th>
				<th>Alamat</th>
				<th>Peta</th>
			</tr>
		</thead>
		<tbody>
			{#each data.items as site (site.id)}
				{@const map = mapsUrl(site.latitude, site.longitude)}
				<tr>
					<td class="font-mono text-xs">{site.code}</td>
					<td><a href="/master/sites/{site.id}" class="link">{site.name}</a></td>
					<td>{site.customerName}</td>
					<td class="max-w-xs truncate">{site.address ?? '—'}</td>
					<td>
						{#if map}<a href={map} target="_blank" rel="noopener" class="link">Buka</a>{:else}—{/if}
					</td>
				</tr>
			{:else}
				<tr><td colspan="5" class="py-8 text-center text-slate-500">Belum ada lokasi.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
