<script lang="ts">
	import Button from '@/components/ui/input/Button.svelte';
	import { fly } from 'svelte/transition';
	import { CirclePlus } from 'lucide-svelte';
	import {
		filtersetPageNew,
		filtersetPageSelect,
		getFiltersetPageTransition
	} from '@/lib/features/filters/filtersetPages.svelte.js';
	import {
		type SelectedFiltersetData,
		setCurrentSelectedFilterset
	} from '@/lib/features/filters/filtersetPageData.svelte.js';
	import { filterTitle } from '@/lib/features/filters/filtersetUtils';
	import FiltersetIcon from '@/lib/features/filters/FiltersetIcon.svelte';
	import { premadeFiltersets } from '@/lib/features/filters/premadeFiltersets';
	import type { FilterCategory } from '@/lib/features/filters/filters';
	import { getId } from "@/lib/utils/uuid";
	import { m } from "@/lib/paraglide/messages";

	let {
		majorCategory,
		subCategory = undefined,
	}: {
		majorCategory: SelectedFiltersetData["majorCategory"],
		subCategory?: FilterCategory,
	} = $props();

	// @ts-ignore
	let premades = $derived(premadeFiltersets[majorCategory] ?? premadeFiltersets[subCategory] ?? [])
</script>

<div
	class="w-full absolute top-0 pb-20"
	in:fly={getFiltersetPageTransition().in}
	out:fly={getFiltersetPageTransition().out}
>
	<Button
		variant="secondary" size="lg" class="w-full"
		onclick={filtersetPageNew}
	>
		<CirclePlus size="18" />
		<span>
			{m.create_new()}
		</span>
	</Button>


	<div class="flex items-center gap-4 my-3">
		<div class="bg-border h-px w-full"></div>
		<span class="text-muted-foreground text-sm whitespace-nowrap">
			{m.or_select_suggested_filter()}
		</span>
		<div class="bg-border h-px w-full"></div>
	</div>

	<div class="overflow-y-auto h-full -mx-4 px-4">
		<div class="flex flex-col gap-1">
			{#each premades as filterset}
				<Button
					class="w-full flex gap-2 items-center justify-start rounded-md py-2 h-12 m-0! pl-4 pr-2"
					size=""
					variant="outline"
					onclick={() => {
						filterset.id = getId()
						setCurrentSelectedFilterset(majorCategory, subCategory, filterset, false)
						filtersetPageSelect()
					}}
				>
					<FiltersetIcon {filterset} size={5} />
					<span>{filterTitle(filterset)}</span>
				</Button>
			{/each}
		</div>
	</div>
</div>
