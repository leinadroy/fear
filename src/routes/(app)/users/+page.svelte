<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SearchBar from '#lib/components/SearchBar.svelte';
	import { ROLE_LABEL } from '#lib/labels.ts';
	import { USER_ROLES } from '#lib/enums.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageHeader title="Pengguna" subtitle="Akun admin, supervisor, dan engineer.">
	{#snippet actions()}
		<a href="/users/new" class="btn-primary">+ Tambah pengguna</a>
	{/snippet}
</PageHeader>

<SearchBar q={data.q} placeholder="Cari nama atau email…">
	<select name="role" class="input max-w-[12rem]" value={data.role ?? ''}>
		<option value="">Semua peran</option>
		{#each USER_ROLES as r (r)}
			<option value={r}>{ROLE_LABEL[r]}</option>
		{/each}
	</select>
</SearchBar>

<div class="table-wrap">
	<table class="table">
		<thead>
			<tr>
				<th>Nama</th>
				<th>Email</th>
				<th>Telepon</th>
				<th>Peran</th>
				<th>Status</th>
			</tr>
		</thead>
		<tbody>
			{#each data.items as u (u.id)}
				<tr>
					<td>
						<a href="/users/{u.id}" class="link">{u.name}</a>
						{#if u.id === data.user.id}<span class="text-xs text-slate-400">(Anda)</span>{/if}
					</td>
					<td>{u.email}</td>
					<td>{u.phone ?? '—'}</td>
					<td>{ROLE_LABEL[u.role]}</td>
					<td>
						<span
							class="badge {u.isActive
								? 'bg-green-100 text-green-700'
								: 'bg-slate-100 text-slate-500'}">{u.isActive ? 'Aktif' : 'Nonaktif'}</span
						>
					</td>
				</tr>
			{:else}
				<tr><td colspan="5" class="py-8 text-center text-slate-500">Tidak ada pengguna.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
