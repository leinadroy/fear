<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import WorkOrderForm from '#lib/components/WorkOrderForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<PageHeader
	title="Edit {data.item.woNumber}"
	subtitle={data.item.title}
	back="/work-orders/{data.item.id}"
/>

<WorkOrderForm
	values={form?.values ?? data.item}
	errors={form?.errors ?? {}}
	siteOptions={data.siteOptions}
	typeOptions={data.typeOptions}
	cancelHref="/work-orders/{data.item.id}"
/>
