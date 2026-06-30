<script lang="ts">
	import { getKojiGeofences, type KojiFeature } from "@/lib/features/koji";
	import Button from "@/components/ui/input/Button.svelte";
	import LucideIcon from "@/components/utils/LucideIcon.svelte";
	import { ChevronRight } from "@lucide/svelte";
	import { selectCoverageMapArea } from "@/lib/features/coverageMap.svelte";
	import { SvelteSet } from "svelte/reactivity";
	import { slide } from "svelte/transition";
	import { hasLoadedFeature, LoadedFeature } from "@/lib/services/initialLoad.svelte";
	import { m } from "@/lib/paraglide/messages";
	import type * as icons from "@lucide/svelte";

	let expandedAreas: Set<number> = new SvelteSet();

	function getAreaIcon(area: KojiFeature): keyof typeof icons {
		return (area.properties.lucideIcon ?? "Globe") as keyof typeof icons;
	}
</script>

{#snippet areaTitle(area: KojiFeature)}
	<LucideIcon class="size-4 ml-2" name={getAreaIcon(area)} />
	<span>{area.properties.name}</span>
{/snippet}

{#snippet jumpButton(area: KojiFeature)}
	<Button
		class="ml-auto px-6"
		size="sm"
		variant="secondary"
		onclick={() => selectCoverageMapArea(area)}
	>
		{m.coveragemap_view()}
	</Button>
{/snippet}

{#snippet areaEntry(area: KojiFeature)}
	{@const isExpanded = expandedAreas.has(area.properties.id)}
	<div class="w-full flex py-2 items-center pl-2 pr-2 gap-3 text-sm font-medium">
		{#if area.properties.children.length === 0}
			{@render areaTitle(area)}
		{:else}
			<Button
				class="gap-3! pl-0!"
				size="sm"
				variant="ghost"
				onclick={() => {
					const existed = expandedAreas.delete(area.properties.id);
					if (!existed) expandedAreas.add(area.properties.id);
				}}
			>
				{@render areaTitle(area)}
				<ChevronRight
					size="16"
					class="transition-[rotate] mt-px"
					style="rotate: {isExpanded ? '90deg' : '0deg'}"
				/>
			</Button>
		{/if}

		{@render jumpButton(area)}
	</div>

	{#if isExpanded}
		<div class="pl-6" transition:slide={{ duration: 150 }}>
			{#each area.properties.children as child (child.properties.id)}
				<div class="w-full flex py-2 items-center pl-2 pr-2 gap-3 text-sm font-medium">
					{@render areaTitle(child)}
					{@render jumpButton(child)}
				</div>
			{/each}
		</div>
	{/if}
{/snippet}

<div class="overflow-hidden">
	{#if hasLoadedFeature(LoadedFeature.KOJI)}
		{#each getKojiGeofences() as area (area.properties.id)}
			{#if !area.properties.parent}
				{@render areaEntry(area)}
			{/if}
		{/each}
	{/if}
</div>
