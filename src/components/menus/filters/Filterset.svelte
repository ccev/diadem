<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import { Eye, EyeClosed } from "lucide-svelte";

	import type { AnyFilterset } from "@/lib/features/filters/filtersets";
	import { openModal } from "@/lib/ui/modal.svelte";
	import {
		type SelectedFiltersetData,
		setCurrentSelectedFilterset,
		toggleFilterset
	} from "@/lib/features/filters/filtersetPageData.svelte";
	import { filtersetPageReset } from "@/lib/features/filters/filtersetPages.svelte";
	import { filterTitle } from "@/lib/features/filters/filtersetUtils";
	import FiltersetIcon from "@/lib/features/filters/FiltersetIcon.svelte";
	import type { FilterCategory } from "@/lib/features/filters/filters";

	let {
		filter,
		majorCategory,
		subCategory
	}: {
		filter: AnyFilterset
		majorCategory: SelectedFiltersetData["majorCategory"],
		subCategory?: FilterCategory,
	} = $props();
</script>

<Button
	class="pl-4! pr-1! h-fit! relative overflow-hidden"
	variant="outline"
	size="lg"
	onclick={() => {
		setCurrentSelectedFilterset(majorCategory, subCategory, filter, true)
		filtersetPageReset()
		openModal("filtersetPokemon")
	}}
>

	<div
		class="flex-1 flex gap-2 items-center justify-start rounded-md py-2 h-12 m-0! pr-2"
		class:opacity-50={!filter.enabled}
	>
		<FiltersetIcon filterset={filter} size={5} />
		<span>{filterTitle(filter)}</span>
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
			toggleFilterset(filter)
		}}
	>
		{#if filter.enabled}
			<EyeClosed size="16" />
		{:else}
			<Eye size="16" />
		{/if}
	</Button>
</Button>