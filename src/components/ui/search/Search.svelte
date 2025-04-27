<script lang="ts">
	import { getConfig } from '@/lib/config.js';
	import Card from '@/components/ui/Card.svelte';
	import { isModalOpen } from '@/lib/modal.svelte';
	import { onMount } from 'svelte';
	import Button from '@/components/ui/Button.svelte';
	import { centerOfMass, centroid, polygon } from '@turf/turf';
	import { getKojiGeofences } from '@/lib/koji';
	import type { Feature } from 'geojson';
	import { Globe, Search } from 'lucide-svelte';
	import LucideIcon from '@/components/utils/LucideIcon.svelte';

	let {
		onjump
	}: {
		onjump: (center: number[], zoom: number) => void
	} = $props()

	let inputText: string = $state("")
	let areas: Feature[] = $derived(
		getKojiGeofences().filter(f => f.properties?.name?.toLowerCase()?.startsWith(inputText.toLowerCase()))
	)

	function getPolygonCenter(feature: Feature) {
		return centroid(feature).geometry.coordinates.reverse()
	}

	let inputElement: HTMLInputElement | undefined = $state()
	onMount(() => {
		inputElement?.focus()
		console.log(getKojiGeofences())
		console.log(centerOfMass(getKojiGeofences()[0]))
	})
</script>

<Card class="shadow-none!" style="width: min(calc(100vw - 1rem), 32rem);">
	<div class="flex items-center border-b px-2">
		<Search class="mr-2 h-4 w-4 shrink-0 opacity-50" />

		<input
			placeholder="Search..."
			bind:this={inputElement}
			bind:value={inputText}
			class="placeholder:text-muted-foreground flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
		>
	</div>

	<div
		class="overflow-y-auto overflow-x-hidden flex flex-col items-center max-h-[32rem] mx-1 pb-1"
	>
		<div
			class="text-muted-foreground p-1 px-2 py-1.5 text-xs font-medium self-start"
		>
			Areas
		</div>
		{#each areas as feature (feature.properties?.name)}
			<Button
				variant="ghost"
				size=""
				class="py-1.5 px-2 rounded-sm"
				onclick={() => onjump(getPolygonCenter(feature), 14)}
				style="width: min(calc(100vw - 1.5rem), 31.5rem);"
			>
				<div class="w-full flex gap-2 items-center text-start">
					<LucideIcon size="16" name={feature.properties.lucideIcon || "Globe"} />
					<span>
						{feature.properties?.name || "Unknown Name"}
					</span>
				</div>

			</Button>
		{/each}
	</div>

<!--	<input-->
<!--		bind:this={inputElement}-->
<!--		class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"-->
<!--	>-->
<!--	<div class="grid grid-cols-2 mt-4">-->
<!--		{#each getKojiGeofences() as feature (feature.properties?.name)}-->
<!--			<Button-->
<!--				variant="ghost"-->
<!--				class="text-center"-->
<!--				onclick={() => onjump(getPolygonCenter(feature), 14)}-->
<!--			>-->
<!--				{feature.properties?.name || "Unknown Name"}-->
<!--			</Button>-->
<!--		{/each}-->
<!--	</div>-->
</Card>