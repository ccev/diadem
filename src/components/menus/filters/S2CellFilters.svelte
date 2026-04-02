<script lang="ts">
	import Switch from "@/components/ui/input/Switch.svelte";
	import Select from "@/components/ui/input/Select.svelte";
	import Slider from "@/components/ui/input/slider/Slider.svelte";
	import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte";
	import { m } from "@/lib/paraglide/messages";
	import { updateMapObject } from "@/lib/mapObjects/updateMapObject";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

	function debounce<T extends (...args: any[]) => void>(fn: T, delay = 200) {
		let timeout: ReturnType<typeof setTimeout>;
		return (...args: Parameters<T>) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => fn(...args), delay);
		};
	}
</script>

<div class="py-2 -mr-4">
	<!--	<div class="flex items-center justify-between px-4 mb-2">-->
	<!--		<p class="font-semibold">-->
	<!--			{m.wayfarer_cells()}-->
	<!--		</p>-->
	<!--		<Switch-->
	<!--			class=""-->
	<!--			checked={getUserSettings().filters.s2cell.wayfarerMode ?? false}-->
	<!--			onCheckedChange={debounce(checked => {-->
	<!--				getUserSettings().filters.s2cell.wayfarerMode = checked-->
	<!--				updateUserSettings()-->
	<!--				updateMapObject(MapObjectType.S2_CELL)-->
	<!--			})}-->
	<!--		/>-->
	<!--	</div>-->
	<div class="px-3 -mt-2">
		<Slider
			min={0}
			max={20}
			title={m.cell_level()}
			value={getUserSettings().filters.s2cell.level ?? 17}
			onchange={debounce((level) => {
				getUserSettings().filters.s2cell.level = level;
				updateUserSettings();
				updateMapObject(MapObjectType.S2_CELL);
			})}
		/>
	</div>
</div>
