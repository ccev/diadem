<script lang="ts">
	import BaseFab from "@/components/ui/fab/BaseFab.svelte";
	import { Layers2 } from "@lucide/svelte";
	import { getConfig } from "@/lib/services/config/config";
	import { MapLibre } from "svelte-maplibre";
	import { getMapStyle } from "@/lib/utils/mapStyle";
	import { openModal } from "@/lib/ui/modal.svelte";
	import Modal from "@/components/ui/modal/Modal.svelte";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import SelectGroupItem from "@/components/ui/input/selectgroup/SelectGroupItem.svelte";
	import RadioGroup from "@/components/ui/input/selectgroup/RadioGroup.svelte";
	import { setWayfarerStyle } from "@/lib/features/wayfarerMap.svelte";
	import maplibre from "maplibre-gl";
	import type { MapStyle } from "@/lib/services/config/configTypes";
	import * as m from "@/lib/paraglide/messages";

	let {
		getStyleId = undefined,
		setStyle = undefined
	}: {
		getStyleId?: () => string | undefined;
		setStyle?: (style: MapStyle) => void;
	} = $props();

	let styles = $derived(getConfig().mapStyles);

	function selectStyle(id: string) {
		const style = styles.find((s) => s.id === id);
		if (style) setStyle?.(style);
	}
</script>

<BaseFab onclick={() => openModal("stylePicker")}>
	<Layers2 size="24" />
</BaseFab>

<Modal modalType="stylePicker" class="w-[calc(100%-1rem)] max-w-md! pb-4 pt-3">
	{#snippet title()}
		<span class="font-semibold text-base px-4 pb-2">{m.settings_map_style()}</span>
	{/snippet}

	<RadioGroup
		value={getStyleId?.() ?? ""}
		onValueChange={selectStyle}
		class="self-center justify-center mt-3 px-4"
	>
		{#each getConfig().mapStyles as mapStyle (mapStyle.id)}
			<SelectGroupItem class="overflow-hidden" value={mapStyle.id}>
				<MapLibre
					center={[
						getConfig().mapPositions.styleLon ?? 9.979,
						getConfig().mapPositions.styleLat ?? 53.563
					]}
					zoom={getConfig().mapPositions.styleZoom ?? 12}
					filterLayers={(l) => l.type !== "symbol"}
					class="w-20 h-18 border-b-2 border-accent"
					style={getMapStyle(mapStyle)}
					attributionControl={false}
					interactive={false}
					zoomOnDoubleClick={false}
				/>
				<span class="pb-1">
					{mapStyle.name}
				</span>
			</SelectGroupItem>
		{/each}
	</RadioGroup>
</Modal>
