<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import BasicMainCard from "@/components/ui/popups/common/BasicMainCard.svelte";
	import OverviewCard from "@/components/ui/popups/common/OverviewCard.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import AccessRouteMap from "@/components/ui/popups/route/AccessRouteMap.svelte";
	import RouteEndpointCard from "@/components/ui/popups/route/RouteEndpointCard.svelte";

	import type { RouteData } from "@/lib/types/mapObjectData/route";
	import { formatDistance, formatDuration, formatElevation } from "@/lib/utils/numberFormat";
	import { ArrowLeftRight, Clock, Ruler, Signpost, TrendingDown, TrendingUp } from "@lucide/svelte";

	let { route }: { route: RouteData } = $props();
	let reversed = $state(false);
</script>

<TitledMainSection Icon={Signpost} title="Follow this Route">
	<BasicMainCard class="w-full divide-y divide-border p-0!">
		<RouteEndpointCard {route} endpoint={reversed ? "end" : "start"} label="start" />
		<RouteEndpointCard {route} endpoint={reversed ? "start" : "end"} label="end" />
	</BasicMainCard>

	<div class="mt-3 grid grid-cols-2 gap-3">
		<OverviewCard Icon={Ruler} title="Distance" value={formatDistance(route.distance_meters)} />
		<OverviewCard Icon={Clock} title="Duration" value={formatDuration(route.duration_seconds)} />
		<OverviewCard
			Icon={TrendingUp}
			title="Uphill"
			value={formatElevation(
				reversed ? route.elevation_downhill_meters : route.elevation_uphill_meters
			)}
		/>
		<OverviewCard
			Icon={TrendingDown}
			title="Downhill"
			value={formatElevation(
				reversed ? route.elevation_uphill_meters : route.elevation_downhill_meters
			)}
		/>
	</div>

	{#if route.reversible}
		<BasicMainCard class="my-3">
			<p class="text-center text-muted-foreground">This route can be started from either end</p>

			<Button
				class="my-1 w-full"
				variant="ghost"
				aria-pressed={reversed}
				onclick={() => (reversed = !reversed)}
			>
				<ArrowLeftRight class="size-3.5" />
				Reverse direction
			</Button>
		</BasicMainCard>
	{/if}

	<AccessRouteMap {route} />
</TitledMainSection>
