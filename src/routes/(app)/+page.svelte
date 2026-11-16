<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { PRIORITY_COLOR, PRIORITY_LABEL, WO_STATUS_COLOR, WO_STATUS_LABEL } from '#lib/labels.ts';
	import { formatDateTime, formatDuration } from '#lib/datetime.ts';
	import type { WoStatus } from '#lib/enums.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const openTotal = $derived(
		data.statusCounts.draft +
			data.statusCounts.assigned +
			data.statusCounts.in_progress +
			data.statusCounts.on_hold
	);

	const tiles = $derived([
		{ label: 'WO terbuka', value: openTotal, href: '/work-orders?status=open' },
		{
			label: 'Sedang dikerjakan',
			value: data.statusCounts.in_progress,
			href: '/work-orders?status=in_progress'
		},
		{
			label: 'Selesai',
			value: data.statusCounts.completed,
			href: '/work-orders?status=completed'
		},
		{ label: 'Kunjungan hari ini', value: data.activitiesToday, href: '/activities' }
	]);

	const statusOrder: WoStatus[] = [
		'draft',
		'assigned',
		'in_progress',
		'on_hold',
		'completed',
		'cancelled'
	];
	let now = $state(new Date());
	$effect(() => {
		const t = setInterval(() => (now = new Date()), 60_000);
		return () => clearInterval(t);
	});
</script>

<PageHeader title="Dashboard" subtitle={`Selamat datang, ${data.user.name}`}>
	{#snippet actions()}
		{#if data.manager}
			<a href="/work-orders/new" class="btn-primary">+ Work Order baru</a>
		{/if}
	{/snippet}
</PageHeader>

<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
	{#each tiles as tile (tile.label)}
		<a href={tile.href} class="card p-4 transition hover:border-blue-300">
			<div class="text-xs font-medium text-slate-500">{tile.label}</div>
			<div class="mt-1 text-3xl font-semibold text-slate-900 tabular-nums">{tile.value}</div>
		</a>
	{/each}
</div>

<div class="mt-6 grid gap-6 xl:grid-cols-3">
	<section class="card xl:col-span-2">
		<div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
			<h2 class="font-semibold text-slate-800">
				{data.manager ? 'Work order terbuka' : 'Tugas saya'}
			</h2>
			<a href="/work-orders" class="text-sm link">Lihat semua</a>
		</div>
		{#if data.upcoming.length === 0}
			<p class="px-4 py-8 text-center text-sm text-slate-500">Tidak ada work order terbuka.</p>
		{:else}
			<ul class="divide-y divide-slate-100">
				{#each data.upcoming as wo (wo.id)}
					<li>
						<a
							href="/work-orders/{wo.id}"
							class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-slate-50"
						>
							<span class="font-mono text-xs text-slate-500">{wo.woNumber}</span>
							<span class="min-w-0 flex-1 truncate font-medium text-slate-800">{wo.title}</span>
							<span class="badge {PRIORITY_COLOR[wo.priority]}">{PRIORITY_LABEL[wo.priority]}</span>
							<span class="badge {WO_STATUS_COLOR[wo.status]}">{WO_STATUS_LABEL[wo.status]}</span>
							<span class="w-full text-xs text-slate-500">
								{wo.siteName} · Jadwal: {formatDateTime(wo.scheduledStart)}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<div class="space-y-6">
		<section class="card">
			<div class="border-b border-slate-100 px-4 py-3">
				<h2 class="font-semibold text-slate-800">Kunjungan berlangsung</h2>
			</div>
			{#if data.ongoing.length === 0}
				<p class="px-4 py-6 text-center text-sm text-slate-500">Tidak ada yang sedang check-in.</p>
			{:else}
				<ul class="divide-y divide-slate-100">
					{#each data.ongoing as act (act.id)}
						<li>
							<a href="/activities/{act.id}" class="block px-4 py-3 hover:bg-slate-50">
								<div class="text-sm font-medium text-slate-800">{act.userName}</div>
								<div class="truncate text-xs text-slate-500">
									{act.woNumber} · {act.woTitle}
								</div>
								<div class="text-xs text-amber-700">
									Sejak {formatDateTime(act.checkInAt)} ({formatDuration(act.checkInAt, now)})
								</div>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="card p-4">
			<h2 class="mb-3 font-semibold text-slate-800">Status work order</h2>
			<ul class="space-y-1.5 text-sm">
				{#each statusOrder as st (st)}
					<li class="flex items-center justify-between">
						<a href="/work-orders?status={st}" class="badge {WO_STATUS_COLOR[st]}">
							{WO_STATUS_LABEL[st]}
						</a>
						<span class="font-medium text-slate-700 tabular-nums">{data.statusCounts[st]}</span>
					</li>
				{/each}
			</ul>
		</section>
	</div>
</div>
