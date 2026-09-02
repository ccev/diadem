<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import BasicMainCard from "@/components/ui/popups/common/BasicMainCard.svelte";
	import OverviewCard from "@/components/ui/popups/common/OverviewCard.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import AccessRouteMap from "@/components/ui/popups/route/AccessRouteMap.svelte";
	import RouteEndpointCard from "@/components/ui/popups/route/RouteEndpointCard.svelte";
	import * as m from "@/lib/paraglide/messages";
	import type { RouteData } from "@/lib/types/mapObjectData/route";
	import {
		formatRouteDistance,
		formatRouteDuration,
		formatRouteElevation
	} from "@/lib/utils/routeFormat";
	import { ArrowLeftRight, Clock, Ruler, Signpost, TrendingDown, TrendingUp } from "@lucide/svelte";

	let { route }: { route: RouteData } = $props();
	let reversed = $state(false);
</script>

<TitledMainSection Icon={Signpost} title={m.follow_this_route()}>
	<BasicMainCard class="w-full divide-y divide-border p-0!">
		<RouteEndpointCard {route} endpoint={reversed ? "end" : "start"} label="start" />
		<RouteEndpointCard {route} endpoint={reversed ? "start" : "end"} label="end" />
	</BasicMainCard>

	<div class="mt-3 grid grid-cols-2 gap-3">
		<OverviewCard
			Icon={Ruler}
			title={m.route_distance()}
			value={formatRouteDistance(route.distance_meters)}
		/>
		<OverviewCard
			Icon={Clock}
			title={m.route_duration()}
			value={formatRouteDuration(route.duration_seconds)}
		/>
		<OverviewCard
			Icon={TrendingUp}
			title={m.route_uphill()}
			value={formatRouteElevation(
				reversed ? route.elevation_downhill_meters : route.elevation_uphill_meters
			)}
		/>
		<OverviewCard
			Icon={TrendingDown}
			title={m.route_downhill()}
			value={formatRouteElevation(
				reversed ? route.elevation_uphill_meters : route.elevation_downhill_meters
			)}
		/>
	</div>

	{#if route.reversible}
		<BasicMainCard class="my-3">
			<p class="text-center text-muted-foreground">
				{m.route_reversible_notice()}
			</p>

			<Button
				class="my-1 w-full"
				variant="ghost"
				aria-pressed={reversed}
				onclick={() => (reversed = !reversed)}
			>
				<ArrowLeftRight class="size-3.5" />
				{m.route_reverse_direction()}
			</Button>
		</BasicMainCard>
	{/if}

	<AccessRouteMap {route} />
</TitledMainSection>
