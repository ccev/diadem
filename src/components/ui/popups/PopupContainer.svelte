<script lang="ts">
	import { fly } from "svelte/transition";
	import { getCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte";
	import { type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import PopupBaseDrawer from "@/components/ui/popups2/common/PopupBaseDrawer.svelte";
	import { Coords } from "$lib/utils/coordinates";
	import { watch } from "runed";
	import { getPopupPropsPokemon } from "@/components/ui/popups2/pokemon/PokemonPopup.svelte";
	import PopupBaseStatic, { type MapObjectPopupProps } from "@/components/ui/popups2/common/PopupBaseStatic.svelte";
	import { getPopupPropsPokestop } from "@/components/ui/popups2/pokestop/PokestopPopup.svelte";

	let {
		alwaysExpanded = false
	}: {
		alwaysExpanded?: boolean
	} = $props();

	const propMap: Partial<Record<MapObjectType, (data: MapData) => MapObjectPopupProps>> = {
		[MapObjectType.POKEMON]: getPopupPropsPokemon,
		[MapObjectType.POKESTOP]: getPopupPropsPokestop
	};

	let data = $derived(getCurrentSelectedData());
	let snapshotData: MapData | undefined = $state(undefined);
	watch(
		() => data,
		() => {
			if (data) {
				snapshotData = $state.snapshot(data);
			}
		}
	);

	let popupProps = $derived(
		snapshotData ? propMap[(snapshotData as MapData).type]?.(snapshotData as MapData) : undefined
	);
</script>

{#if alwaysExpanded}
	{#if data}
		<div
			class="z-10 w-100 h-screen pointer-events-auto border border-border bg-card/60 backdrop-blur-sm"
			transition:fly={{ duration: 90, x: 120 }}
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
		open={Boolean(data)}
		coords={new Coords(snapshotData?.lat ?? 0, snapshotData?.lon ?? 0)}
		data={snapshotData}
		props={popupProps}
	/>
{/if}