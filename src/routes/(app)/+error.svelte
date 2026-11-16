<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} — FEAR</title>
</svelte:head>

<div class="mx-auto mt-10 max-w-md card p-8 text-center">
	<div class="text-4xl font-bold text-slate-300">{page.status}</div>
	<p class="mt-3 text-slate-700">
		{page.status === 404 ? 'Halaman atau data tidak ditemukan.' : page.error?.message}
	</p>
	<a href="/" class="mt-6 btn-secondary">Kembali ke Dashboard</a>
</div>
