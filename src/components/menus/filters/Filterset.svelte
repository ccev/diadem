<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import { m } from "@/lib/paraglide/messages";
	import { Eye, EyeClosed } from "@lucide/svelte";

	import type { AnyFilterset } from "@/lib/features/filters/filtersets";
	import { type ModalType, openModal } from "@/lib/ui/modal.svelte";
	import {
		type SelectedFiltersetData,
		setCurrentSelectedFilterset,
		toggleFilterset
	} from "@/lib/features/filters/filtersetPageData.svelte";
	import { filtersetPageReset } from "@/lib/features/filters/filtersetPages.svelte";
	import { filterTitle } from "@/lib/features/filters/filtersetUtils.svelte";
	import FiltersetIcon from "@/lib/features/filters/FiltersetIcon.svelte";
	import type { FilterCategory } from "@/lib/features/filters/filters";

	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

	let {
		filter,
		majorCategory,
		subCategory,
		filterModal,
		mapObject
	}: {
		filter: AnyFilterset;
		majorCategory: SelectedFiltersetData["majorCategory"];
		subCategory?: FilterCategory;
		filterModal: ModalType;
		mapObject: MapObjectType;
	} = $props();
</script>

<div
	class="flex min-w-0 items-center gap-1 rounded-md border border-input bg-background pr-1 transition-colors hover:bg-accent"
>
	<Button
		class="min-w-0 flex-1 pl-0! pr-0! py-0! h-12! justify-start!"
		variant="ghost"
		title={filterTitle($state.snapshot(filter))}
		onclick={() => {
			setCurrentSelectedFilterset(majorCategory, subCategory, filter, true);
			filtersetPageReset();
			openModal(filterModal);
		}}
	>
		<span
			class="h-full w-0.5 rounded-l-md transition-colors shrink-0"
			class:bg-green={filter.enabled}
			class:bg-red={!filter.enabled}
		></span>
		<span
			class="min-w-0 flex flex-1 gap-2 items-center transition-opacity"
			class:opacity-50={!filter.enabled}
		>
			<FiltersetIcon filterset={$state.snapshot(filter)} size={5} />
			<span class="text-fade text-left flex-1">{filterTitle($state.snapshot(filter))}</span>
		</span>
	</Button>
	<Button
		class="shrink-0"
		variant="outline"
		size="icon"
		title={filter.enabled ? m.disable_filters() : m.enable_filters()}
		aria-label={filterTitle($state.snapshot(filter))}
		aria-pressed={filter.enabled}
		onclick={() => toggleFilterset(filter, mapObject)}
	>
		{#if filter.enabled}
			<Eye size="16" />
		{:else}
			<EyeClosed size="16" />
		{/if}
	</Button>
</div>
