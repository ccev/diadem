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
</script>

{#snippet areaEntry(area: KojiFeature)}
	<div
		class="w-full flex py-2 items-center px-4 gap-3 text-sm font-medium"
	>
		<LucideIcon class="size-4" name={area.properties.lucideIcon ?? "Globe"} />
		<span>{area.properties.name}</span>

		{#if area.properties.children.length > 0}
			<ChevronRight
				size="16"
				class="transition-[rotate] mt-px"
				style="rotate: {false ? '90deg' : '0deg'}"
			/>
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

		<!--{#each area.children as child}-->
		<!--	{@render areaEntry(child)}-->
		<!--{/each}-->
	</div>
{/snippet}

<div class="space-y-2">
	<Card class="overflow-hidden py-1 divide-y divide-border">
		{#each getKojiGeofences() as area (area.properties.id)}
			{#if !area.properties.parent}
				{@render areaEntry(area)}
			{/if}
		{/each}
	</Card>

</div>