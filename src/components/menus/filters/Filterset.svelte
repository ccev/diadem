<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import { Eye, EyeClosed } from "lucide-svelte";

	import type { AnyFilterset } from "@/lib/features/filters/filtersets";
	import { type ModalType, openModal } from "@/lib/ui/modal.svelte";
	import {
		type SelectedFiltersetData,
		setCurrentSelectedFilterset,
		toggleFilterset
	} from "@/lib/features/filters/filtersetPageData.svelte";
	import { filtersetPageReset } from "@/lib/features/filters/filtersetPages.svelte";
	import { filterTitle } from "@/lib/features/filters/filtersetUtils";
	import FiltersetIcon from "@/lib/features/filters/FiltersetIcon.svelte";
	import type { FilterCategory } from "@/lib/features/filters/filters";
	import type { MapObjectType } from "@/lib/types/mapObjectData/mapObjects";

	let {
		filter,
		majorCategory,
		subCategory,
		filterModal,
		mapObject
	}: {
		filter: AnyFilterset
		majorCategory: SelectedFiltersetData["majorCategory"],
		subCategory?: FilterCategory,
		filterModal: ModalType
		mapObject: MapObjectType
	} = $props();
</script>

<Button
	class="pl-0! pr-1! h-fit! relative overflow-hidden group"
	variant="outline"
	size="lg"
	onclick={() => {
		setCurrentSelectedFilterset(majorCategory, subCategory, filter, true)
		filtersetPageReset()
		openModal(filterModal)
	}}
>
	<div
		class="h-12 w-0.5 mr-1.5 transition-colors shrink-0"
		class:bg-green={filter.enabled}
		class:bg-red={!filter.enabled}
	></div>

	<div
		class="shrink-1 min-w-0 w-full flex gap-2 items-center justify-start rounded-md py-2 h-12 m-0! pr-0 transition-opacity relative"
		class:opacity-50={!filter.enabled}
	>
		<div
			class="absolute right-0 h-full w-4 bg-linear-to-l from-background to-transparent group-hover:from-accent transition-colors"
		></div>
		<FiltersetIcon filterset={$state.snapshot(filter)} size={5} />

		<span class="overflow-x-hidden">{filterTitle($state.snapshot(filter))}</span>
	</div>
	<!--	<Button class="flex-1 justify-start rounded-md py-2 h-12 m-0! pl-4 pr-2" size="" variant="ghost">-->
	<!--		<span>{filter.icon}</span>-->
	<!--		<span>{filter.title}</span>-->
	<!--	</Button>-->

	<!--	<Button class="ml-auto my-0!" variant="outline" size="icon">-->
	<!--		<Pencil size="16" />-->
	<!--	</Button>-->

	<Button
		class="ml-auto my-0! shrink-0"
		variant="outline"
		size="icon"
		onclick={(e) => {
			e.stopPropagation()
			toggleFilterset(filter, mapObject)
		}}
	>
		{#if filter.enabled}
			<Eye size="16" />
		{:else}
			<EyeClosed size="16" />
		{/if}
	</Button>
</Button>