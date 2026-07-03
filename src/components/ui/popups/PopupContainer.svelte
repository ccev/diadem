<script lang="ts">
	import { fly } from "svelte/transition";
	import { getCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte";
	import { type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import PopupBaseDrawer from "@/components/ui/popups2/common/PopupBaseDrawer.svelte";
	import { Coords } from "$lib/utils/coordinates";
	import { watch } from "runed";
	import { getPopupPropsPokemon } from "@/components/ui/popups2/pokemon/PokemonPopup.svelte";
	import PopupBaseStatic, {
		type MapObjectPopupProps
	} from "@/components/ui/popups2/common/PopupBaseStatic.svelte";
	import { getPopupPropsPokestop } from "@/components/ui/popups2/pokestop/PokestopPopup.svelte";
	import { getPopupPropsNest } from "@/components/ui/popups2/nest/NestPopup.svelte";
	import { getPopupPropsTappable } from "@/components/ui/popups2/tappable/TappablePopup.svelte";
	import { getPopupPropsSpawnpoint } from "@/components/ui/popups2/spawnpoint/SpawnpointPopup.svelte";
	import { getPopupPropsStation } from "@/components/ui/popups2/station/StationPopup.svelte";
	import { getPopupPropsGym } from "@/components/ui/popups2/gym/GymPopup.svelte";
	import { isAllowedTwoSidebars } from "$lib/utils/device";
	import { closeMenu } from "$lib/ui/menus.svelte";

	let {
		alwaysExpanded = false
	}: {
		alwaysExpanded?: boolean;
	} = $props();

	const propMap: Partial<Record<MapObjectType, (data: MapData) => MapObjectPopupProps>> = {
		[MapObjectType.POKEMON]: getPopupPropsPokemon,
		[MapObjectType.POKESTOP]: getPopupPropsPokestop,
		[MapObjectType.NEST]: getPopupPropsNest,
		[MapObjectType.TAPPABLE]: getPopupPropsTappable,
		[MapObjectType.SPAWNPOINT]: getPopupPropsSpawnpoint,
		[MapObjectType.GYM]: getPopupPropsGym,
		[MapObjectType.STATION]: getPopupPropsStation
	};

	let data = $derived(getCurrentSelectedData());
	let doesDataExist = $derived(Boolean(data && data.type !== MapObjectType.S2_CELL));
	let snapshotData: MapData | undefined = $state(undefined);

	watch(
		() => data,
		() => {
			if (doesDataExist && data) {
				if (!isAllowedTwoSidebars()) {
					closeMenu();
				}
				snapshotData = $state.snapshot(data);
			}
		}
	);

	let popupProps = $derived(
		snapshotData ? propMap[(snapshotData as MapData).type]?.(snapshotData as MapData) : undefined
	);
</script>

{#if alwaysExpanded}
	{#if doesDataExist}
		<div
			class="z-10 h-full min-w-80 max-w-130 basis-[32.5rem] shrink grow-0 overflow-y-auto rounded-l-xl border border-border bg-card pt-6 pointer-events-auto"
			transition:fly={{ duration: 130, x: 120 }}
		>
			<PopupBaseStatic
				coords={new Coords(snapshotData?.lat ?? 0, snapshotData?.lon ?? 0)}
				data={snapshotData}
				props={popupProps}
				onlyShowNavigationButton={false}
			/>
		</div>
	{/if}
{:else}
	<PopupBaseDrawer
		open={doesDataExist}
		coords={new Coords(snapshotData?.lat ?? 0, snapshotData?.lon ?? 0)}
		data={snapshotData}
		props={popupProps}
	/>
{/if}
