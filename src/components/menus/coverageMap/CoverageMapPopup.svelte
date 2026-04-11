<script lang="ts">
	import Card from "@/components/ui/Card.svelte";
	import { getClickedCoverageMapAreas } from "@/lib/features/coverageMap.svelte";
	import { slide } from "svelte/transition";
	import LucideIcon from "@/components/utils/LucideIcon.svelte";

	let areas = $derived(getClickedCoverageMapAreas());
</script>

{#if areas}
	<div class="w-full mt-2" transition:slide={{ duration: 50 }}>
		<Card class="w-full pr-6 pl-4 py-4 space-y-2">
			{#each areas as area}
				<div class="flex items-center gap-2 font-semibold">
					<LucideIcon class="size-4.5 ml-2" name={area.properties.lucideIcon ?? "Globe"} />
					<p>
						<span>{area.properties.name}</span>
						{#if area.properties.parentName}
							<span class="text-muted-foreground font-normal">
								/ {area.properties.parentName}
							</span>
						{/if}
					</p>
				</div>
			{/each}
		</Card>
	</div>
{/if}
