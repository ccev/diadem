<script lang="ts">
	import BasicMainCard from "@/components/ui/popups/common/BasicMainCard.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import RouteCard from "@/components/ui/popups/route/RouteCard.svelte";
	import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import * as m from "@/lib/paraglide/messages";
	import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
	import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
	import type { RouteData } from "@/lib/types/mapObjectData/route";
	import { Features } from "@/lib/utils/features";
	import { routeStartsAt } from "@/lib/utils/routeUtils";
	import { Signpost } from "@lucide/svelte";

	let { fortId }: { fortId: string } = $props();
	let routes = $derived(
		Object.values(getMapObjects())
			.filter(
				(object): object is RouteData =>
					object.type === MapObjectType.ROUTE && routeStartsAt(object, fortId)
			)
			.sort((a, b) => a.name.localeCompare(b.name))
	);
</script>

{#if hasFeatureAnywhere(getUserDetails().permissions, Features.ROUTE)}
	<TitledMainSection
		Icon={Signpost}
		title={m.routes_starting_here()}
		disabled={routes.length === 0}
	>
		{#if routes.length === 0}
			<BasicMainCard>{m.no_routes_starting_here()}</BasicMainCard>
		{:else}
			<div class="-mx-4">
				<div class="flex w-full gap-3 overflow-x-auto px-4 *:shrink-0">
					{#each routes as route (route.mapId)}
						<BasicMainCard class="min-w-72 max-w-80">
							<RouteCard {route} originFortId={fortId} navigatesToPopup />
						</BasicMainCard>
					{/each}
				</div>
			</div>
		{/if}
	</TitledMainSection>
{/if}
