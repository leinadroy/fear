<script lang="ts">
	import { enhance } from '#lib/enhance.ts';
	import type { ActionForm } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { form }: PageProps & { form: ActionForm } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Masuk — FEAR</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-slate-50 px-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<a href="/welcome" class="inline-block" title="Tentang FEAR">
				<h1 class="text-3xl font-bold tracking-tight text-slate-900">FEAR</h1>
				<p class="mt-1 text-sm text-slate-500">Field Activity Engineering</p>
			</a>
		</div>

		<form
			method="POST"
			class="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update({ reset: false });
					submitting = false;
				};
			}}
		>
			<h2 class="text-lg font-semibold text-slate-800">Masuk ke akun Anda</h2>

			{#if form?.message}
				<p
					class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
					role="alert"
				>
					{form.message}
				</p>
			{/if}

			<label class="block">
				<span class="text-sm font-medium text-slate-700">Email</span>
				<input
					type="email"
					name="email"
					value={form?.email ?? ''}
					autocomplete="username"
					required
					class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			</label>

			<label class="block">
				<span class="text-sm font-medium text-slate-700">Password</span>
				<input
					type="password"
					name="password"
					autocomplete="current-password"
					required
					class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			</label>

			<button
				type="submit"
				disabled={submitting}
				class="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-60"
			>
				{submitting ? 'Memproses…' : 'Masuk'}
			</button>
		</form>
	</div>
</main>
