<script lang="ts">
	import { enhance } from '#lib/enhance.ts';
	import type { ActionForm } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps & { form: ActionForm } = $props();
	let submitting = $state(false);

	const valid = $derived(data.valid && !form?.expired);
	const errors = $derived((form?.errors ?? {}) as Record<string, string>);
</script>

<svelte:head>
	<title>Password baru — FEAR</title>
	<!-- Token ada di URL: jangan sampai ikut terkirim ke situs lain lewat header Referer. -->
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-slate-50 px-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<a href="/welcome" class="inline-block" title="Tentang FEAR">
				<h1 class="text-3xl font-bold tracking-tight text-slate-900">FEAR</h1>
				<p class="mt-1 text-sm text-slate-500">Field Activity Engineering</p>
			</a>
		</div>

		<div class="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
			{#if !valid}
				<h2 class="text-lg font-semibold text-slate-800">Link tidak berlaku</h2>
				<p class="text-sm text-slate-600">
					Link reset password ini sudah kedaluwarsa, sudah pernah dipakai, atau tidak lengkap. Link
					hanya berlaku 60 menit dan sekali pakai.
				</p>
				<a
					href="/forgot-password"
					class="block w-full rounded-md bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700"
				>
					Minta link baru
				</a>
			{:else}
				<form
					method="POST"
					class="space-y-5"
					use:enhance={() => {
						submitting = true;
						return async ({ update }) => {
							await update({ reset: false });
							submitting = false;
						};
					}}
				>
					<div>
						<h2 class="text-lg font-semibold text-slate-800">Buat password baru</h2>
						<p class="mt-1 text-sm text-slate-500">
							Untuk akun <span class="font-medium text-slate-700">{data.email}</span>. Minimal 8
							karakter.
						</p>
					</div>

					<input type="hidden" name="token" value={data.token} />
					<!-- Bantu password manager mengenali akun yang diubah. -->
					<input type="hidden" name="username" value={data.email} autocomplete="username" />

					<label class="block">
						<span class="text-sm font-medium text-slate-700">Password baru</span>
						<input
							type="password"
							name="password"
							autocomplete="new-password"
							minlength="8"
							required
							aria-invalid={errors.password ? 'true' : undefined}
							class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
						/>
						{#if errors.password}
							<span class="mt-1 block text-sm text-red-600">{errors.password}</span>
						{/if}
					</label>

					<label class="block">
						<span class="text-sm font-medium text-slate-700">Ulangi password baru</span>
						<input
							type="password"
							name="passwordConfirm"
							autocomplete="new-password"
							minlength="8"
							required
							aria-invalid={errors.passwordConfirm ? 'true' : undefined}
							class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
						/>
						{#if errors.passwordConfirm}
							<span class="mt-1 block text-sm text-red-600">{errors.passwordConfirm}</span>
						{/if}
					</label>

					<button
						type="submit"
						disabled={submitting}
						class="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-60"
					>
						{submitting ? 'Menyimpan…' : 'Simpan password baru'}
					</button>
				</form>
			{/if}
		</div>
	</div>
</main>
