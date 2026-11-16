<script lang="ts">
	import { enhance } from '#lib/enhance.ts';

	let {
		action = '?/delete',
		confirmText = 'Hapus data ini? Tindakan ini tidak bisa dibatalkan.',
		label = 'Hapus',
		small = false,
		fields = {}
	}: {
		action?: string;
		confirmText?: string;
		label?: string;
		small?: boolean;
		fields?: Record<string, string | number>;
	} = $props();
</script>

<form
	method="POST"
	{action}
	class="inline"
	use:enhance={({ cancel }) => {
		if (!confirm(confirmText)) cancel();
	}}
>
	{#each Object.entries(fields) as [name, value] (name)}
		<input type="hidden" {name} {value} />
	{/each}
	<button type="submit" class={small ? 'btn-ghost-danger btn-sm' : 'btn-danger'}>{label}</button>
</form>
