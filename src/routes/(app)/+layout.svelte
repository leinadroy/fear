<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { enhance } from '#lib/enhance.ts';
	import { ROLE_LABEL } from '#lib/labels.ts';
	import type { UserRole } from '#lib/enums.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	type NavItem = { href: string; label: string; roles?: UserRole[] };
	type NavGroup = { title?: string; items: NavItem[] };

	const NAV: NavGroup[] = [
		{
			items: [
				{ href: '/', label: 'Dashboard' },
				{ href: '/work-orders', label: 'Work Order' },
				{ href: '/activities', label: 'Aktivitas Lapangan' }
			]
		},
		{
			title: 'Master Data',
			items: [
				{ href: '/master/customers', label: 'Pelanggan', roles: ['admin', 'supervisor'] },
				{ href: '/master/sites', label: 'Lokasi', roles: ['admin', 'supervisor'] },
				{
					href: '/master/activity-types',
					label: 'Jenis Aktivitas',
					roles: ['admin', 'supervisor']
				},
				{ href: '/master/materials', label: 'Material', roles: ['admin', 'supervisor'] }
			]
		},
		{
			title: 'Pengaturan',
			items: [{ href: '/users', label: 'Pengguna', roles: ['admin'] }]
		}
	];

	const nav = $derived(
		NAV.map((g) => ({
			...g,
			items: g.items.filter((i) => !i.roles || i.roles.includes(data.user.role))
		})).filter((g) => g.items.length > 0)
	);

	function isActive(href: string) {
		const path = page.url.pathname;
		return href === '/' ? path === '/' : path === href || path.startsWith(href + '/');
	}

	let menuOpen = $state(false);
	afterNavigate(() => (menuOpen = false));
</script>

<div class="min-h-screen bg-slate-50 lg:flex">
	<!-- Top bar (mobile) -->
	<header
		class="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden"
	>
		<span class="text-lg font-bold tracking-tight text-slate-900">FEAR</span>
		<button
			type="button"
			class="btn-secondary btn-sm"
			aria-expanded={menuOpen}
			aria-controls="sidebar"
			onclick={() => (menuOpen = !menuOpen)}
		>
			{menuOpen ? 'Tutup' : 'Menu'}
		</button>
	</header>

	<!-- Sidebar -->
	<aside
		id="sidebar"
		class="{menuOpen
			? 'block'
			: 'hidden'} fixed inset-x-0 top-[53px] bottom-0 z-20 overflow-y-auto border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:block lg:h-screen lg:w-60 lg:shrink-0"
	>
		<div class="hidden px-5 pt-5 pb-3 lg:block">
			<div class="text-xl font-bold tracking-tight text-slate-900">FEAR</div>
			<div class="text-xs text-slate-500">Field Activity Engineering</div>
		</div>

		<nav class="space-y-5 px-3 py-4 lg:py-2">
			{#each nav as group (group.title ?? 'main')}
				<div>
					{#if group.title}
						<div class="px-2 pb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
							{group.title}
						</div>
					{/if}
					<ul class="space-y-0.5">
						{#each group.items as item (item.href)}
							<li>
								<a
									href={item.href}
									class="block rounded-md px-2 py-1.5 text-sm {isActive(item.href)
										? 'bg-blue-50 font-medium text-blue-700'
										: 'text-slate-700 hover:bg-slate-100'}"
									aria-current={isActive(item.href) ? 'page' : undefined}
								>
									{item.label}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</nav>

		<div class="border-t border-slate-200 px-5 py-4">
			<div class="truncate text-sm font-medium text-slate-800">{data.user.name}</div>
			<div class="truncate text-xs text-slate-500">
				{data.user.email} · {ROLE_LABEL[data.user.role]}
			</div>
			<form method="POST" action="/logout" class="mt-3" use:enhance>
				<button type="submit" class="btn-secondary w-full btn-sm">Keluar</button>
			</form>
		</div>
	</aside>

	<main class="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">
		{@render children()}
	</main>
</div>
