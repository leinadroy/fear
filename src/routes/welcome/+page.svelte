<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const cta = $derived(
		data.user ? { href: '/', label: 'Buka dashboard' } : { href: '/login', label: 'Masuk' }
	);

	/** Ikon garis sederhana (24×24, stroke). */
	const ICONS: Record<string, string> = {
		clipboard:
			'M9 5H7a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2M9 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1H9V5Zm0 7h6m-6 4h4',
		pin: 'M12 21s-6-5.4-6-10a6 6 0 1 1 12 0c0 4.6-6 10-6 10Zm0-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
		camera:
			'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Zm8 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
		box: 'M12 3 4 7v10l8 4 8-4V7l-8-4Zm0 0v18M4 7l8 4 8-4',
		chart: 'M4 20h16M7 16v-4m5 4V8m5 8v-6',
		users:
			'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 8a5 5 0 0 1 10 0m2-8a3 3 0 1 0 0-6m1 14h3a5 5 0 0 0-4-4.9'
	};

	const features = [
		{
			icon: 'clipboard',
			title: 'Work order terpusat',
			text: 'Nomor WO otomatis, prioritas, jadwal, lokasi dan instruksi kerja tercatat rapi di satu tempat.'
		},
		{
			icon: 'pin',
			title: 'Check-in dengan GPS',
			text: 'Engineer check-in dan check-out langsung dari HP. Koordinat dicatat sebagai bukti kehadiran di lokasi.'
		},
		{
			icon: 'camera',
			title: 'Foto dokumentasi',
			text: 'Foto sebelum dan sesudah pekerjaan diunggah dari lapangan, tersimpan aman dan hanya bisa dilihat tim.'
		},
		{
			icon: 'box',
			title: 'Material terpakai',
			text: 'Catat kabel, konektor dan material lain per kunjungan, lengkap dengan jumlah dan satuannya.'
		},
		{
			icon: 'chart',
			title: 'Dashboard real-time',
			text: 'Lihat WO terbuka, siapa yang sedang di lapangan, dan jumlah kunjungan hari ini sekilas pandang.'
		},
		{
			icon: 'users',
			title: 'Akses per peran',
			text: 'Admin, supervisor dan engineer hanya melihat dan mengubah apa yang menjadi tanggung jawabnya.'
		}
	];

	const steps = [
		{
			title: 'Buat work order',
			text: 'Supervisor mencatat pekerjaan: pelanggan, lokasi, jenis aktivitas, prioritas dan jadwal.'
		},
		{
			title: 'Tugaskan tim',
			text: 'Pilih engineer dan tentukan ketua tim. WO langsung muncul di daftar tugas mereka.'
		},
		{
			title: 'Kerjakan di lokasi',
			text: 'Engineer check-in saat tiba, unggah foto, dan catat material yang dipakai.'
		},
		{
			title: 'Check-out & selesai',
			text: 'Isi catatan hasil kerja lalu check-out. Ketua tim bisa langsung menandai WO selesai.'
		}
	];

	const roles = [
		{
			name: 'Admin',
			text: 'Mengelola pengguna, master data, dan seluruh work order.',
			color: 'bg-violet-100 text-violet-700'
		},
		{
			name: 'Supervisor',
			text: 'Membuat & menugaskan WO, memantau progres, mengoreksi data kunjungan.',
			color: 'bg-blue-100 text-blue-700'
		},
		{
			name: 'Engineer',
			text: 'Melihat tugasnya, check-in/out di lokasi, mengunggah foto dan material.',
			color: 'bg-amber-100 text-amber-800'
		}
	];
</script>

<svelte:head>
	<title>FEAR — Field Activity Engineering</title>
	<meta
		name="description"
		content="FEAR: aplikasi pengelolaan work order dan kunjungan lapangan engineer — check-in GPS, foto dokumentasi, material, dan dashboard real-time."
	/>
</svelte:head>

{#snippet icon(name: string, cls = 'h-5 w-5')}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="1.8"
		stroke-linecap="round"
		stroke-linejoin="round"
		class={cls}
		aria-hidden="true"><path d={ICONS[name]} /></svg
	>
{/snippet}

<div class="min-h-screen bg-white text-slate-800">
	<!-- Navigasi -->
	<header class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
		<div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
			<a href="/welcome" class="flex items-baseline gap-2">
				<span class="text-xl font-bold tracking-tight text-slate-900">FEAR</span>
				<span class="hidden text-xs text-slate-500 sm:inline">Field Activity Engineering</span>
			</a>
			<nav class="flex items-center gap-1 text-sm">
				<a
					href="#fitur"
					class="hidden rounded-md px-3 py-2 text-slate-600 hover:text-slate-900 md:block">Fitur</a
				>
				<a
					href="#cara-kerja"
					class="hidden rounded-md px-3 py-2 text-slate-600 hover:text-slate-900 md:block"
					>Cara kerja</a
				>
				<a
					href="#peran"
					class="hidden rounded-md px-3 py-2 text-slate-600 hover:text-slate-900 md:block">Peran</a
				>
				<a href={cta.href} class="ml-2 btn-primary">{cta.label}</a>
			</nav>
		</div>
	</header>

	<main>
		<!-- Hero -->
		<section class="relative overflow-hidden">
			<div
				class="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_80%_-10%,var(--color-blue-100),transparent)]"
				aria-hidden="true"
			></div>
			<div
				class="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24"
			>
				<div>
					<p
						class="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
					>
						<span class="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
						Untuk tim engineering lapangan
					</p>
					<h1
						class="mt-5 text-4xl font-bold tracking-tight text-balance text-slate-900 sm:text-5xl"
					>
						Kelola pekerjaan lapangan, dari kantor sampai ke lokasi.
					</h1>
					<p class="mt-5 max-w-xl text-lg text-pretty text-slate-600">
						FEAR menyatukan work order, penugasan engineer, check-in GPS, foto dokumentasi dan
						material terpakai dalam satu aplikasi web yang nyaman dibuka dari HP.
					</p>
					<div class="mt-8 flex flex-wrap gap-3">
						<a href={cta.href} class="btn-primary px-5 py-2.5 text-base">{cta.label}</a>
						<a href="#cara-kerja" class="btn-secondary px-5 py-2.5 text-base">Lihat cara kerja</a>
					</div>
				</div>

				<!-- Pratinjau tampilan aplikasi (ilustrasi) -->
				<div class="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden="true">
					<div class="card p-5 shadow-lg shadow-slate-200/70">
						<div class="flex items-start justify-between gap-3">
							<div>
								<div class="font-mono text-xs text-slate-400">WO-202611-0012</div>
								<div class="mt-1 font-semibold text-slate-900">Instalasi router kantor cabang</div>
								<div class="text-sm text-slate-500">PT Contoh Sejahtera · Gedung A</div>
							</div>
							<span class="badge bg-amber-100 text-amber-800">Dikerjakan</span>
						</div>
						<div class="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-xs">
							<div>
								<div class="text-slate-400">Prioritas</div>
								<div class="mt-0.5 font-medium text-orange-700">Tinggi</div>
							</div>
							<div>
								<div class="text-slate-400">Jadwal</div>
								<div class="mt-0.5 font-medium text-slate-700">09.00 – 12.30</div>
							</div>
							<div>
								<div class="text-slate-400">Ketua tim</div>
								<div class="mt-0.5 font-medium text-slate-700">Rudi S.</div>
							</div>
						</div>
					</div>

					<div
						class="relative -mt-3 ml-6 card border-amber-300 p-4 shadow-lg shadow-slate-200/70 sm:ml-12"
					>
						<div class="flex items-center justify-between text-sm">
							<span class="font-medium text-slate-800">Kunjungan berlangsung</span>
							<span class="text-xs text-amber-700">1 j 25 m</span>
						</div>
						<div class="mt-2 flex items-center gap-1.5 text-xs text-green-700">
							{@render icon('pin', 'h-3.5 w-3.5')} Check-in 09.04 · GPS tercatat
						</div>
						<div class="mt-3 grid grid-cols-4 gap-2">
							<div class="aspect-square rounded-md bg-slate-200"></div>
							<div class="aspect-square rounded-md bg-slate-300"></div>
							<div class="aspect-square rounded-md bg-slate-200"></div>
							<div
								class="flex aspect-square items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-400"
							>
								+ Foto
							</div>
						</div>
						<div class="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
							<span class="text-xs text-slate-500">Kabel UTP Cat6 · 25 meter</span>
							<span class="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white"
								>Check-out</span
							>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Fitur -->
		<section id="fitur" class="scroll-mt-16 border-t border-slate-100 bg-slate-50 py-16 lg:py-24">
			<div class="mx-auto max-w-6xl px-4 sm:px-6">
				<div class="max-w-2xl">
					<h2 class="text-3xl font-bold tracking-tight text-slate-900">
						Semua yang dibutuhkan tim lapangan
					</h2>
					<p class="mt-3 text-slate-600">
						Tidak perlu lagi laporan lewat chat, foto yang tercecer, atau rekap material di
						spreadsheet terpisah.
					</p>
				</div>
				<div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each features as f (f.title)}
						<div class="card p-6">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600"
							>
								{@render icon(f.icon)}
							</div>
							<h3 class="mt-4 font-semibold text-slate-900">{f.title}</h3>
							<p class="mt-1.5 text-sm text-slate-600">{f.text}</p>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- Cara kerja -->
		<section id="cara-kerja" class="scroll-mt-16 py-16 lg:py-24">
			<div class="mx-auto max-w-6xl px-4 sm:px-6">
				<div class="max-w-2xl">
					<h2 class="text-3xl font-bold tracking-tight text-slate-900">Cara kerja</h2>
					<p class="mt-3 text-slate-600">Empat langkah dari pekerjaan masuk sampai selesai.</p>
				</div>
				<ol class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{#each steps as step, i (step.title)}
						<li class="relative">
							<div
								class="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white"
							>
								{i + 1}
							</div>
							{#if i < steps.length - 1}
								<div
									class="absolute top-[18px] right-0 left-12 hidden h-px bg-slate-200 lg:block"
									aria-hidden="true"
								></div>
							{/if}
							<h3 class="mt-4 font-semibold text-slate-900">{step.title}</h3>
							<p class="mt-1.5 text-sm text-slate-600">{step.text}</p>
						</li>
					{/each}
				</ol>
			</div>
		</section>

		<!-- Peran -->
		<section id="peran" class="scroll-mt-16 border-t border-slate-100 bg-slate-50 py-16 lg:py-24">
			<div class="mx-auto max-w-6xl px-4 sm:px-6">
				<div class="max-w-2xl">
					<h2 class="text-3xl font-bold tracking-tight text-slate-900">
						Satu aplikasi, tiga peran
					</h2>
					<p class="mt-3 text-slate-600">
						Setiap orang melihat apa yang perlu ia kerjakan — engineer hanya melihat WO yang
						ditugaskan kepadanya.
					</p>
				</div>
				<div class="mt-10 grid gap-4 md:grid-cols-3">
					{#each roles as role (role.name)}
						<div class="card p-6">
							<span class="badge {role.color} text-sm">{role.name}</span>
							<p class="mt-3 text-sm text-slate-600">{role.text}</p>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- Ajakan -->
		<section class="py-16 lg:py-24">
			<div class="mx-auto max-w-6xl px-4 sm:px-6">
				<div
					class="flex flex-col items-start gap-6 rounded-2xl bg-slate-900 px-6 py-10 sm:px-10 md:flex-row md:items-center md:justify-between"
				>
					<div>
						<h2 class="text-2xl font-bold tracking-tight text-white">Siap mulai bekerja?</h2>
						<p class="mt-2 text-slate-300">
							Masuk dengan akun yang diberikan admin tim Anda. Bisa dibuka dari laptop maupun HP.
						</p>
					</div>
					<a
						href={cta.href}
						class="btn shrink-0 bg-white px-5 py-2.5 text-base text-slate-900 hover:bg-slate-100 focus:ring-white"
						>{cta.label}</a
					>
				</div>
			</div>
		</section>
	</main>

	<footer class="border-t border-slate-200">
		<div
			class="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:justify-between sm:px-6"
		>
			<span
				><span class="font-semibold text-slate-700">FEAR</span> · Field Activity Engineering</span
			>
			<span>© {new Date().getFullYear()}</span>
		</div>
	</footer>
</div>
