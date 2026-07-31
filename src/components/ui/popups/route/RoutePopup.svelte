<script module lang="ts">
	import type { MapObjectPopupProps } from "@/components/ui/popups/common/PopupBaseStatic.svelte";
	import BasicMainCard from "@/components/ui/popups/common/BasicMainCard.svelte";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import RouteCard from "@/components/ui/popups/route/RouteCard.svelte";
	import { type MapData } from "@/lib/mapObjects/mapObjectTypes";
	import * as m from "@/lib/paraglide/messages";
	import type { RouteData } from "@/lib/types/mapObjectData/route";
	import { Signpost } from "@lucide/svelte";

	export { image, main };

	export function getPopupPropsRoute(data: MapData) {
		data = data as RouteData;
		return {
			type: m.pogo_route(),
			title: data.name || m.unknown_route(),
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
			alt={data.name || m.pogo_route()}
			class="size-14 rounded-full object-cover"
		/>
	{:else}
		<div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent">
			<Signpost class="size-6" />
		</div>
	{/if}
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as RouteData}
	<TitledMainSection Icon={Signpost} title={m.route_details()}>
		<BasicMainCard>
			<RouteCard route={data} />
		</BasicMainCard>
	</TitledMainSection>
{/snippet}
