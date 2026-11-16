<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		q = '',
		placeholder = 'Cari…',
		children
	}: { q?: string; placeholder?: string; children?: Snippet } = $props();
</script>

<!-- GET form: filter tersimpan di URL sehingga bisa di-bookmark / dibagikan. -->
<form method="GET" class="mb-4 flex flex-wrap gap-2" data-sveltekit-keepfocus>
	<input type="search" name="q" value={q} {placeholder} class="input max-w-xs" />
	{@render children?.()}
	<button type="submit" class="btn-secondary">Cari</button>
</form>
