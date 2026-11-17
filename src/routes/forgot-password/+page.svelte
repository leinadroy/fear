<script lang="ts">
	import { enhance } from '#lib/enhance.ts';
	import type { ActionForm } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { form }: PageProps & { form: ActionForm } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Lupa password — FEAR</title>
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
			{#if form?.sent}
				<h2 class="text-lg font-semibold text-slate-800">Cek email Anda</h2>
				<p class="text-sm text-slate-600">
					Jika <span class="font-medium text-slate-800">{form.email}</span> terdaftar di FEAR, link untuk
					membuat password baru sudah dikirim ke email tersebut. Link berlaku 60 menit.
				</p>
				<p class="text-sm text-slate-600">
					Tidak ada email masuk? Periksa folder spam, atau hubungi admin FEAR untuk mengatur ulang
					password Anda.
				</p>
				<a
					href="/login"
					class="block w-full rounded-md border border-slate-300 px-4 py-2 text-center font-medium text-slate-700 hover:bg-slate-50"
				>
					Kembali ke halaman masuk
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
						<h2 class="text-lg font-semibold text-slate-800">Lupa password</h2>
						<p class="mt-1 text-sm text-slate-500">
							Masukkan email akun Anda. Kami kirimkan link untuk membuat password baru.
						</p>
					</div>

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

					<button
						type="submit"
						disabled={submitting}
						class="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-60"
					>
						{submitting ? 'Mengirim…' : 'Kirim link reset'}
					</button>

					<p class="text-center text-sm">
						<a href="/login" class="font-medium text-blue-600 hover:text-blue-800 hover:underline">
							Kembali ke halaman masuk
						</a>
					</p>
				</form>
			{/if}
		</div>
	</div>
</main>
