<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		error,
		hint,
		required = false,
		class: className = '',
		children
	}: {
		label: string;
		error?: string;
		hint?: string;
		required?: boolean;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<label class="block {className}">
	<span class="mb-1 block text-sm font-medium text-slate-700">
		{label}{#if required}<span class="text-red-500"> *</span>{/if}
	</span>
	{@render children()}
	{#if error}
		<span class="mt-1 block text-xs text-red-600">{error}</span>
	{:else if hint}
		<span class="mt-1 block text-xs text-slate-500">{hint}</span>
	{/if}
</label>
