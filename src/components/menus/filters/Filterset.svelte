<script lang="ts">
	import Button from '@/components/ui/input/Button.svelte';
	import Switch from '@/components/ui/input/Switch.svelte';
	import { Eye, EyeClosed, Pencil } from 'lucide-svelte';

	import type { AnyFilterset } from '@/lib/features/filters/filtersets';
	import { openModal } from '@/lib/ui/modal.svelte';
	import {
		setCurrentSelectedFilterset,
		toggleFiltersetEnabled
	} from '@/lib/features/filters/filtersetPageData.svelte';
	import { filtersetPageReset } from '@/lib/features/filters/filtersetPages.svelte';

	let {
		filter
	}: {
		filter: AnyFilterset
	} = $props()
</script>

<Button
	class="pl-4! pr-1! h-fit! relative overflow-hidden"
	variant="outline"
	size="lg"
	onclick={() => {
		setCurrentSelectedFilterset("pokemon", filter, true)
		filtersetPageReset()
		openModal("filtersetPokemon")
	}}
>

	<div
		class="flex-1 flex gap-1 items-center justify-start rounded-md py-2 h-12 m-0! pr-2"
		class:opacity-50={!filter.enabled}
	>
		<span>{filter.icon}</span>
		<span>{filter.title}</span>
	</div>
	<!--	<Button class="flex-1 justify-start rounded-md py-2 h-12 m-0! pl-4 pr-2" size="" variant="ghost">-->
	<!--		<span>{filter.icon}</span>-->
	<!--		<span>{filter.title}</span>-->
	<!--	</Button>-->

	<!--	<Button class="ml-auto my-0!" variant="outline" size="icon">-->
	<!--		<Pencil size="16" />-->
	<!--	</Button>-->

	<Button
		class="ml-auto my-0!"
		variant="outline"
		size="icon"
		onclick={(e) => {
			e.stopPropagation()
			toggleFiltersetEnabled("pokemon", filter.id)
		}}
	>
		{#if filter.enabled}
			<EyeClosed size="16" />
		{:else}
			<Eye size="16" />
		{/if}
	</Button>
</Button>