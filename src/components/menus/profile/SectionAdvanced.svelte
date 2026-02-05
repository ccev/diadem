<script lang="ts">
	import { getUserSettings } from '@/lib/services/userSettings.svelte.js';
	import { Code } from 'lucide-svelte';
	import MenuCard from '@/components/menus/MenuCard.svelte';
	import Toggle from '@/components/ui/input/Toggle.svelte';
	import NumberInput from '@/components/ui/input/NumberInput.svelte';
	import * as m from '@/lib/paraglide/messages';
	import { onSettingsChange } from '@/lib/services/settings';
	import SliderRange from "@/components/ui/input/slider/SliderRange.svelte";
	import SliderSteps from "@/components/ui/input/slider/SliderSteps.svelte";
	import Slider from "@/components/ui/input/slider/Slider.svelte";
</script>

<MenuCard
	title={m.settings_advanced()}
	Icon={Code}
>
	<Toggle
		title={m.settings_show_debug_title()}
		description={m.settings_show_debug_description()}
		onclick={() => onSettingsChange("showDebugMenu", !getUserSettings().showDebugMenu)}
		value={getUserSettings().showDebugMenu}
	/>

	<Toggle
		title={m.settings_load_map_objects_while_moving_title()}
		description={m.settings_load_map_objects_while_moving_description()}
		onclick={() => onSettingsChange("loadMapObjectsWhileMoving", !getUserSettings().loadMapObjectsWhileMoving)}
		value={getUserSettings().loadMapObjectsWhileMoving}
	/>

	<NumberInput
		title={m.settings_load_map_objects_padding_title()}
		description={m.settings_load_map_objects_padding_description()}
		value={getUserSettings().loadMapObjectsPadding}
		onchange={e => onSettingsChange("loadMapObjectsPadding", parseFloat(e.target.value) || 0)}
		min="0"
		step="10"
	/>
</MenuCard>