<script lang="ts">
	import { ChevronDown, ChevronRight, Eye, EyeClosed, FunnelPlus } from 'lucide-svelte';
	import type { AnyFilter, FilterCategory } from '@/lib/features/filters/filters';
	import Switch from '@/components/ui/input/Switch.svelte';
	import Button from '@/components/ui/input/Button.svelte';

	import { slide } from 'svelte/transition';
	import Filterset from '@/components/menus/filters/Filterset.svelte';
	import { type ModalType, openModal } from '@/lib/ui/modal.svelte.js';
	import { filtersetPageNew, filtersetPageReset } from '@/lib/features/filters/filtersetPages.svelte';
	import {
		getNewFilterset,
		type SelectedFiltersetData,
		setCurrentSelectedFilterset
	} from '@/lib/features/filters/filtersetPageData.svelte';
	import { getUserSettings, updateUserSettings } from '@/lib/services/userSettings.svelte';
	import { updateAllMapObjects } from '@/lib/mapObjects/updateMapObject';
	import * as m from '@/lib/paraglide/messages';
	import { getMapObjectCounts } from '@/lib/mapObjects/mapObjectsState.svelte';
	import type { MapObjectType } from '@/lib/types/mapObjectData/mapObjects';
	import { formatNumberCompact } from '@/lib/utils/numberFormat';
	import { tick } from 'svelte';
	import { deleteAllFeaturesOfType } from "@/lib/map/featuresGen.svelte";
	import { mAny } from "@/lib/utils/anyMessage";

	let {
		majorCategory,
		subCategory = undefined,
		title,
		onEnabledChange,
		filter,
		mapObject,
		filterModal = undefined,
		isExpandable = false,
		isFilterable = true,
		expanded = $bindable(false)
	}: {
		majorCategory: SelectedFiltersetData["majorCategory"],
		subCategory?: FilterCategory,
		title: string,
		onEnabledChange: (thisCategory: FilterCategory, value: boolean) => void,
		filter: AnyFilter,
		mapObject: MapObjectType,
		filterModal?: ModalType | undefined,
		isExpandable?: boolean,
		isFilterable?: boolean,
		subCategories?: FilterCategory[],
		expanded?: boolean
	} = $props();

	let isEnabled: boolean = $derived(filter.enabled);
	let hasAnyFilterset: boolean = $derived((filter?.filters?.length ?? 0) > 0);
	let allFiltersetsDisabled: boolean = $derived(
		hasAnyFilterset && filter.filters?.every((f) => !f.enabled)
	);

	function onAddFilter() {
		if (!filterModal) return;
		setCurrentSelectedFilterset(majorCategory, subCategory, getNewFilterset(), false);
		filtersetPageReset();
		openModal(filterModal);
	}

	function onToggleAll() {
		const shouldEnable = allFiltersetsDisabled;
		let filter = getUserSettings().filters[majorCategory]

		// @ts-ignore
		if (subCategory) filter = filter[subCategory]
		// @ts-ignore
		filter.filters = filter.filters.map((filterset) => ({ ...filterset, enabled: shouldEnable }))

		updateUserSettings();
		deleteAllFeaturesOfType(mapObject)
		tick().then(() => updateAllMapObjects().then());
	}
</script>

{#snippet showingCount()}
	{#if mapObject && !subCategory}
		{@const { showing, examined } = getMapObjectCounts(mapObject)}
		<p class="text-sm text-muted-foreground font-semibold">
			{#if showing === examined}
				{m.showing_showing({ showing })}
			{:else}
				{m.showing_showing_of_examined({
					showing: formatNumberCompact(showing),
					examined: formatNumberCompact(examined)
				})}
			{/if}
		</p>
	{/if}
{/snippet}

<div
	class="py-2 pr-4 pl-0 --border-red-200 --border-1"
	class:py-0!={isEnabled && isFilterable && !hasAnyFilterset}
>
	<div class="flex gap-2 justify-start items-center whitespace-normal">
		{#if !isExpandable}
			<div
				class="pl-4 py-2"
			>
				<p class="font-semibold text-base">
					{title}
				</p>
				{#if isEnabled}
					{@render showingCount()}
					{#if isFilterable && !hasAnyFilterset}
						<Button class="-ml-2" variant="ghost" size="sm" onclick={onAddFilter}>
							<FunnelPlus size="14" />
							<span>{mAny(`add_filter_${majorCategory}_${subCategory}`)}</span>
						</Button>
					{/if}
				{/if}
			</div>

		{:else}
			<Button
				class="flex-col gap-0! items-start! w-full! h-fit"
				variant="ghost"
				onclick={() => expanded = !expanded}
			>
				<div class="flex items-center justify-start! h-fit! gap-1 flex-1">
					<p class="font-semibold text-base">
						{title}
					</p>
					{#if isExpandable}
							<ChevronRight
							size="16"
							class="transition-[rotate] mt-px"
							style="rotate: {expanded ? '90deg' : '0deg'}"
						/>
					{/if}
				</div>

				{#if isEnabled}
					{@render showingCount()}
				{/if}
			</Button>

		{/if}
		<!--		<span class="text-sm text-muted-foreground">67</span>-->

		<div class="flex gap-1 ml-auto items-center">


			<!--		{#if isFilterable && !hasAnyFilterset && isEnabled}-->
			<!--			<Button class="" variant="outline" size="sm" onclick={placeholderAddFilter}>-->
			<!--				<FunnelPlus size="14" />-->
			<!--&lt;!&ndash;				<span>Filter</span>&ndash;&gt;-->
			<!--			</Button>-->
			<!--		{/if}-->

			<Switch class="" bind:checked={isEnabled} onCheckedChange={v => onEnabledChange(subCategory, v)} />
		</div>
	</div>

	{#if isEnabled && isFilterable}
		{#if hasAnyFilterset && filterModal}
			<div
				class="w-full my-1 flex flex-col gap-1 pl-2"
				transition:slide={{ duration: 90 }}
			>
				{#each filter.filters ?? [] as filterset (filterset.id)}
					<Filterset filter={filterset} {majorCategory} {subCategory} {filterModal} />
				{/each}
			</div>

			<div class="flex justify-between ml-2" class:mb-0.5={hasAnyFilterset}>

				<Button class="" variant="ghost" size="sm" onclick={onAddFilter}>
					<FunnelPlus size="14" />
					<span>{mAny(`add_filter_${majorCategory}_${subCategory}`)}</span>
				</Button>
				{#if hasAnyFilterset}
					<Button
						class=""
						variant="ghost"
						size="sm"
						onclick={onToggleAll}
					>
						{#if allFiltersetsDisabled}
							<Eye size="16" />
							<span>Enable all</span>
						{:else}
							<EyeClosed size="16" />
							<span>Disable all</span>
						{/if}
					</Button>
				{/if}
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