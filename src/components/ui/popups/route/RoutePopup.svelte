<script module lang="ts">
	import type { MapObjectPopupProps } from "@/components/ui/popups/common/PopupBaseStatic.svelte";
	import BasicMainCard from "@/components/ui/popups/common/BasicMainCard.svelte";
	import ExpandableDescription from "@/components/ui/popups/common/ExpandableDescription.svelte";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import StatsMainCardEntry from "@/components/ui/popups/common/StatsMainCardEntry.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import UpdatedTimes from "@/components/ui/popups/common/UpdatedTimes.svelte";
	import RouteFollowSection from "@/components/ui/popups/route/RouteFollowSection.svelte";
	import { type MapData } from "@/lib/mapObjects/mapObjectTypes";

	import type { RouteData } from "@/lib/types/mapObjectData/route";
	import { Hash, Info, Signpost } from "@lucide/svelte";
	import { mRouteTag } from "$lib/services/ingameLocale";
	import { getRouteColor } from "$lib/utils/routeUtils";

	export { image, main };

	export function getPopupPropsRoute(data: MapData) {
		data = data as RouteData;
		return {
			type: "Route",
			title: data.name || "Unknown Route",
			image,
			main
		} as MapObjectPopupProps;
	}
</script>

{#snippet image(d: MapData)}
	{@const data = d as RouteData}
	{#if data.image}
		<ImagePopup
			src={data.image}
			alt={data.name || "Route"}
			class="size-12 rounded-full object-cover outline-offset-2 outline-3 ml-2"
			style="outline-color: {getRouteColor(data)}"
		/>
	{:else}
		<div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent">
			<Signpost class="size-6" />
		</div>
	{/if}
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as RouteData}

	{#key data.mapId}
		<RouteFollowSection route={data} />
	{/key}

	<TitledMainSection Icon={Info} title="About this Route">
		<BasicMainCard>
			<ExpandableDescription description={data.description} class="whitespace-pre-line" />

			<div class="my-3">
				{#if data.tags.length > 0}
					<div class="flex flex-wrap gap-1.5">
						{#each data.tags as tag (tag)}
							<span class="rounded-sm bg-accent-highlight px-4 py-1.5 text-sm font-medium">
								{mRouteTag(tag)}
							</span>
						{/each}
					</div>
				{:else}
					<p class="">Unavailable</p>
				{/if}
			</div>

			{#if data.shortcode}
				<StatsMainCardEntry class="mb-3" Icon={Hash} name="Share Code" value={data.shortcode} />
			{/if}
			<UpdatedTimes updated={data.updated} />
		</BasicMainCard>
	</TitledMainSection>
{/snippet}
