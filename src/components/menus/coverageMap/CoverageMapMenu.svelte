<script lang="ts">
	import { getKojiGeofences, type KojiFeature, type KojiReference } from "@/lib/features/koji";
	import Button from "@/components/ui/input/Button.svelte";
	import LucideIcon from "@/components/utils/LucideIcon.svelte";
	import Card from "@/components/ui/Card.svelte";
	import { ChevronRight } from "lucide-svelte";
	import { getFeatureJump } from "@/lib/utils/geo";
	import { flyTo, jumpTo } from "@/lib/map/utils";
	import { closeSearchModal } from "@/lib/ui/modal.svelte";
	import { coverageMapActiveSnapPoint } from "@/lib/features/coverageMap.svelte";
	import { SvelteSet } from "svelte/reactivity";
	import {slide, fly} from "svelte/transition";

	let expandedAreas: Set<number> = new SvelteSet()
</script>

{#snippet areaTitle(area: KojiFeature)}
	<LucideIcon class="size-4 ml-2" name={area.properties.lucideIcon ?? "Globe"} />
	<span>{area.properties.name}</span>
{/snippet}

{#snippet areaEntry(area: KojiFeature)}
	{@const isExpanded = expandedAreas.has(area.properties.id)}
	<div
		class="w-full flex py-2 items-center pl-2 pr-2 gap-3 text-sm font-medium"
	>
		{#if area.properties.children.length === 0}
			{@render areaTitle(area)}
		{:else}
			<Button
				class="gap-3! pl-0!"
				size="sm"
				variant="ghost"
				onclick={() => {
					const existed = expandedAreas.delete(area.properties.id)
					if (!existed) expandedAreas.add(area.properties.id)
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

		<Button
			class="ml-auto px-6"
			size="sm"
			variant="secondary"
			onclick={() => {
				coverageMapActiveSnapPoint.reset()
				const params = getFeatureJump(area, true)
				flyTo(params.coords, params.zoom)
			}}
		>
			View
		</Button>
	</div>

	{#if isExpanded}
		<div
			class="text-muted-foreground text-sm px-4 py-2 space-y-2"
			transition:slide={{duration: 150 }}
		>
			{#each area.properties.children as child (child.properties.id)}
				<p>
					{child.properties.name}
				</p>
			{/each}
		</div>
	{/if}
{/snippet}

<div class="space-y-2">
	<Card class="overflow-hidden">
		{#each getKojiGeofences() as area (area.properties.id)}
			{#if !area.properties.parent}
				{@render areaEntry(area)}
			{/if}
		{/each}
	</Card>

</div>