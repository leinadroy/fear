<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		subtitle,
		back,
		actions
	}: { title: string; subtitle?: string; back?: string; actions?: Snippet } = $props();
</script>

<svelte:head>
	<title>{title} — FEAR</title>
</svelte:head>

<div class="mb-6 flex flex-wrap items-end justify-between gap-3">
	<div class="min-w-0">
		{#if back}
			<a href={back} class="mb-1 inline-block text-sm text-slate-500 hover:text-slate-700">
				← Kembali
			</a>
		{/if}
		<h1 class="truncate text-2xl font-semibold text-slate-900">{title}</h1>
		{#if subtitle}
			<p class="mt-1 text-sm text-slate-500">{subtitle}</p>
		{/if}
	</div>
	{#if actions}
		<div class="flex flex-wrap gap-2">{@render actions()}</div>
	{/if}
</div>
