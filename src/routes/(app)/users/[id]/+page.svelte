<script lang="ts">
	import { enhance } from '#lib/enhance.ts';
	import { page } from '$app/state';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Field from '#lib/components/Field.svelte';
	import DeleteButton from '#lib/components/DeleteButton.svelte';
	import { ROLE_LABEL } from '#lib/labels.ts';
	import { USER_ROLES } from '#lib/enums.ts';
	import { s } from '#lib/utils.ts';
	import type { ActionForm } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps & { form: ActionForm } = $props();

	const isNew = $derived(!data.item);
	const isSelf = $derived(data.item?.id === data.user.id);
	const v = $derived<Record<string, unknown>>(
		form?.values ?? data.item ?? { role: 'engineer', isActive: true }
	);
	const err = $derived<Record<string, string>>(form?.errors ?? {});
	const pwErr = $derived<Record<string, string>>(form?.pwErrors ?? {});
	const active = $derived(form?.values ? v.isActive === 'on' : v.isActive !== false);
</script>

<PageHeader title={data.item ? data.item.name : 'Pengguna baru'} back="/users" />

{#if page.url.searchParams.has('saved') && !form}
	<p class="mb-4 max-w-2xl alert-success">Akun berhasil dibuat.</p>
{/if}
{#if form?.message}<p class="mb-4 max-w-2xl alert-error">{form.message}</p>{/if}

<form method="POST" action="?/save" use:enhance class="max-w-2xl space-y-4 card p-6">
	<h2 class="font-semibold text-slate-800">Profil</h2>
	<div class="grid gap-4 sm:grid-cols-2">
		<Field label="Nama lengkap" required error={err.name}>
			<input name="name" value={s(v.name)} class="input" maxlength="100" required />
		</Field>
		<Field label="Email (untuk login)" required error={err.email}>
			<input
				name="email"
				type="email"
				value={s(v.email)}
				class="input"
				maxlength="150"
				autocomplete="off"
				required
			/>
		</Field>
		<Field label="Telepon" error={err.phone}>
			<input name="phone" type="tel" value={s(v.phone)} class="input" maxlength="30" />
		</Field>
		<Field
			label="Peran"
			required
			error={err.role}
			hint="Admin: semua akses. Supervisor: kelola WO & master data. Engineer: kerjakan WO."
		>
			<select name="role" class="input" value={s(v.role)}>
				{#each USER_ROLES as r (r)}
					<option value={r}>{ROLE_LABEL[r]}</option>
				{/each}
			</select>
		</Field>
	</div>

	{#if isNew}
		<div class="grid gap-4 sm:grid-cols-2">
			<Field
				label="Password"
				required
				error={err.password}
				hint="Minimal 8 karakter. Berikan ke pengguna, minta diganti nanti."
			>
				<input name="password" type="password" class="input" autocomplete="new-password" required />
			</Field>
			<Field label="Ulangi password" required error={err.passwordConfirm}>
				<input
					name="passwordConfirm"
					type="password"
					class="input"
					autocomplete="new-password"
					required
				/>
			</Field>
		</div>
	{/if}

	<label class="flex items-center gap-2 text-sm text-slate-700">
		<input
			type="checkbox"
			name="isActive"
			checked={active}
			disabled={isSelf}
			class="rounded border-slate-300"
		/>
		Akun aktif (bisa login)
	</label>
	{#if isSelf}<input type="hidden" name="isActive" value="on" />{/if}

	<div class="flex justify-end gap-2 pt-2">
		<a href="/users" class="btn-secondary">Batal</a>
		<button type="submit" class="btn-primary">Simpan</button>
	</div>
</form>

{#if data.item}
	<form
		method="POST"
		action="?/password"
		use:enhance={() =>
			({ update }) =>
				update({ reset: true })}
		class="mt-6 max-w-2xl space-y-4 card p-6"
	>
		<h2 class="font-semibold text-slate-800">Ganti password</h2>
		{#if form?.pwSaved}
			<p class="alert-success">
				Password diperbarui.{#if !isSelf}
					Pengguna harus login ulang.{/if}
			</p>
		{/if}
		<div class="grid gap-4 sm:grid-cols-2">
			<Field label="Password baru" required error={pwErr.password}>
				<input name="password" type="password" class="input" autocomplete="new-password" required />
			</Field>
			<Field label="Ulangi password baru" required error={pwErr.passwordConfirm}>
				<input
					name="passwordConfirm"
					type="password"
					class="input"
					autocomplete="new-password"
					required
				/>
			</Field>
		</div>
		<div class="flex justify-end">
			<button type="submit" class="btn-secondary">Simpan password</button>
		</div>
	</form>

	{#if !isSelf}
		<div class="mt-6 max-w-2xl">
			<DeleteButton label="Hapus pengguna" />
		</div>
	{/if}
{/if}
