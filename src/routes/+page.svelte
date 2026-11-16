<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const roleLabel = { admin: 'Admin', supervisor: 'Supervisor', engineer: 'Engineer' } as const;
</script>

<svelte:head>
	<title>FEAR — Field Activity Engineering</title>
</svelte:head>

<div class="min-h-screen bg-slate-50">
	<header class="border-b border-slate-200 bg-white">
		<div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
			<span class="text-lg font-bold tracking-tight text-slate-900">FEAR</span>
			{#if data.user}
				<div class="flex items-center gap-3 text-sm">
					<span class="text-slate-600">
						{data.user.name}
						<span class="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
							{roleLabel[data.user.role]}
						</span>
					</span>
					<form method="POST" action="/logout">
						<button
							type="submit"
							class="rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100"
						>
							Keluar
						</button>
					</form>
				</div>
			{/if}
		</div>
	</header>

	<main class="mx-auto max-w-5xl px-4 py-10">
		<h1 class="text-2xl font-semibold text-slate-900">Selamat datang, {data.user?.name}</h1>
		<p class="mt-2 text-slate-600">Field Activity Engineering — dashboard akan dibangun di sini.</p>
	</main>
</div>
