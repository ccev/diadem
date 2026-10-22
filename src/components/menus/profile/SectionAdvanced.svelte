<script lang="ts">
	import { getUserSettings } from "@/lib/services/userSettings.svelte.js";
	import { Code, Wrench } from "@lucide/svelte";
	import MenuCard from "@/components/menus/MenuCard.svelte";
	import Toggle from "@/components/ui/input/Toggle.svelte";
	import NumberInput from "@/components/ui/input/NumberInput.svelte";

	import { onSettingsChange } from "@/lib/services/settings";
	import { getMap, handleRotatePitchDisable, resetMap } from "@/lib/map/map.svelte";
</script>

<MenuCard title="Advanced" Icon={Wrench}>
	<Toggle
		title="Show Map Debug Menu"
		description="Display in-depth information about the app"
		onclick={() => onSettingsChange("showDebugMenu", !getUserSettings().showDebugMenu)}
		value={getUserSettings().showDebugMenu}
	/>

	<Toggle
		title="Lock map rotate &amp; pitch"
		description="Disables rotation and pitching of the map"
		onclick={() => {
			const newValue = !getUserSettings().enableRotatePitch;

			if (!newValue) {
				resetMap();
			}

			onSettingsChange("enableRotatePitch", newValue);
			const map = getMap();
			if (map) handleRotatePitchDisable(map);
		}}
		value={!getUserSettings().enableRotatePitch}
	/>

	<Toggle
		title="Aggressive Map Updates"
		description={/* @wc-include */ "⚠ Major performance impact! Fetch data while moving the map"}
		onclick={() =>
			onSettingsChange("loadMapObjectsWhileMoving", !getUserSettings().loadMapObjectsWhileMoving)}
		value={getUserSettings().loadMapObjectsWhileMoving}
	/>

	<NumberInput
		title="Map Update Padding"
		description="Additional pixels to fetch around the map's bounding box"
		value={getUserSettings().loadMapObjectsPadding}
		onchange={(e) =>
			onSettingsChange(
				"loadMapObjectsPadding",
				parseFloat((e.target as HTMLInputElement)?.value) || 0
			)}
		min="0"
		step="10"
	/>
</MenuCard>
