<script lang="ts">
	import { ChevronDown, FunnelPlus } from 'lucide-svelte';
	import type { AnyFilter, FilterCategory } from '@/lib/features/filters/filters';
	import Switch from '@/components/ui/input/Switch.svelte';
	import Button from '@/components/ui/input/Button.svelte';

	import { slide } from 'svelte/transition';
	import Filterset from '@/components/menus/filters/Filterset.svelte';
	import { openModal } from '@/lib/ui/modal.svelte.js';
	import { filtersetPageNew, filtersetPageReset } from '@/lib/features/filters/filtersetPages.svelte';
	import { getNewFilterset, setCurrentSelectedFilterset } from '@/lib/features/filters/filtersetPageData.svelte';

	let {
		category,
		title,
		onEnabledChange,
		filter,
		isExpandable = false,
		isFilterable = true,
		expanded = $bindable(false)
	}: {
		category: FilterCategory,
		title: string,
		onEnabledChange: (thisCategory: FilterCategory, value: boolean) => void,
		filter: AnyFilter,
		isExpandable?: boolean,
		isFilterable?: boolean,
		subCategories?: FilterCategory[],
		expanded?: boolean
	} = $props();

	let isEnabled: boolean = $derived(filter.enabled);
	let hasAnyFilterset: boolean = $derived((filter?.filters?.length ?? 0) > 0);

	function placeholderAddFilter() {
		if (category !== 'pokemonMajor') {
			openModal('filtersetQuest');
			return
		}

		setCurrentSelectedFilterset(category, getNewFilterset(), false)
		filtersetPageReset()
		openModal("filtersetPokemon")
	}
</script>

<div
	class="py-2 pr-4 pl-0"
>
	<div class="flex gap-2 justify-start items-center whitespace-normal">
		{#if !isExpandable}
			<div class="pl-4 py-2">
				<p class="font-semibold text-base">
					{title}
				</p>
				<p class="text-sm text-muted-foreground font-semibold">
					Showing 12 of 267
				</p>
			</div>

		{:else}
			<Button
				class="flex items-center justify-start! gap-1 flex-1"
				variant="ghost"
				onclick={() => expanded = !expanded}
			>
				<span class="font-semibold text-base">
					{title}
				</span>
				{#if isExpandable}
				<ChevronDown size="20" />
				{:else}
					<FunnelPlus class="ml-1" size="14" />
				{/if}
			</Button>
		{/if}
<!--		<span class="text-sm text-muted-foreground">67</span>-->

		<div class="flex gap-1 ml-auto items-center">



		{#if isFilterable && !hasAnyFilterset && isEnabled}
			<Button class="" variant="outline" size="sm" onclick={placeholderAddFilter}>
				<FunnelPlus size="14" />
<!--				<span>Filter</span>-->
			</Button>
		{/if}

		<Switch class="" bind:checked={isEnabled} onCheckedChange={v => onEnabledChange(category, v)} />
		</div>
	</div>

	{#if isEnabled && isFilterable}
		{#if hasAnyFilterset}
			<div
				class="w-full my-1 flex flex-col gap-1 pl-2"
				transition:slide={{ duration: 90 }}
			>
				{#each filter.filters ?? [] as filterset (filterset.id)}
					<Filterset filter={filterset} />
				{/each}
			</div>

			<div class="flex justify-start ml-2" class:mb-0.5={hasAnyFilterset}>
				<!--{#if hasAnyFilterset}-->
				<!--	<Button class="w-full" variant="ghost" size="sm">-->
				<!--		<FunnelX size="16" />-->
				<!--		<span>Ignore filters</span>-->
				<!--	</Button>-->
				<!--{/if}-->
				<Button class="" variant="ghost" size="sm" onclick={placeholderAddFilter}>
					<FunnelPlus size="14" />
					<span>Add filter</span>
				</Button>
			</div>
		{/if}
	{/if}
</div>

<!--<div-->
<!--	class="py-2 pr-4 pl-0 w-full flex gap-2 justify-between"-->
<!--	class:flex-col={showFiltered}-->
<!--	class:pl-4={showFiltered}-->
<!--	class:items-center={!showFiltered}-->
<!--&gt;-->
<!--	{#if showFiltered}-->
<!--		<MenuTitle {title} />-->
<!--	{:else}-->
<!--		<Button class="flex items-center justify-start! gap-1 flex-1" variant="ghost" onclick={() => expanded = !expanded}>-->
<!--			<MenuTitle {title} />-->

<!--			<ChevronDown size="20" />-->
<!--		</Button>-->
<!--	{/if}-->


<!--	{#if showFiltered}-->
<!--		<RadioGroup-->
<!--			class="gap-3! w-full"-->
<!--			value={getUserSettings().filters[category].type}-->
<!--			childCount={showFiltered ? 3 : 2}-->
<!--			{onValueChange}-->
<!--		>-->
<!--			<RadioGroupItem value="all" class="py-2">-->
<!--				<Eye size="16" />-->
<!--				<span>-->
<!--			{#if showFiltered}-->
<!--				All-->
<!--			{:else}-->
<!--				Show-->
<!--			{/if}-->
<!--		</span>-->
<!--			</RadioGroupItem>-->
<!--			<RadioGroupItem value="none" class="py-2">-->
<!--				<EyeOff size="16" />-->
<!--				<span>-->
<!--			{#if showFiltered}-->
<!--				None-->
<!--			{:else}-->
<!--				Hide-->
<!--			{/if}-->
<!--		</span>-->
<!--			</RadioGroupItem>-->
<!--			{#if showFiltered}-->
<!--				<RadioGroupItem value="filtered" class="py-2">-->
<!--					<Funnel size="16" />-->
<!--					<span>Filtered</span>-->
<!--				</RadioGroupItem>-->
<!--			{/if}-->
<!--		</RadioGroup>-->

<!--	{:else}-->

<!--		<Switch />-->


<!--	{/if}-->
<!--</div>-->