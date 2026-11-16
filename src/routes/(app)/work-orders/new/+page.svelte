<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import WorkOrderForm from '#lib/components/WorkOrderForm.svelte';
	import type { ActionForm } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps & { form: ActionForm } = $props();
</script>

<PageHeader
	title="Work Order baru"
	subtitle="Nomor WO dibuat otomatis. Petugas ditugaskan setelah WO disimpan."
	back="/work-orders"
/>

<WorkOrderForm
	values={form?.values ?? {}}
	errors={form?.errors ?? {}}
	siteOptions={data.siteOptions}
	typeOptions={data.typeOptions}
	cancelHref="/work-orders"
/>
