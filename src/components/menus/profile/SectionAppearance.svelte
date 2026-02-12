<script lang="ts">
	import * as m from "@/lib/paraglide/messages";
	import { Cloud, Moon, Paintbrush, Sun } from "lucide-svelte";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import { isMenuSidebar } from "@/lib/utils/device";
	import { onMapStyleChange, onSettingsChange } from "@/lib/services/settings";
	import { getConfig } from "@/lib/services/config/config";
	import MenuCard from "@/components/menus/MenuCard.svelte";
	import SliderSteps from "@/components/ui/input/slider/SliderSteps.svelte";
	import Toggle from "@/components/ui/input/Toggle.svelte";
	import Select from "@/components/ui/input/Select.svelte";
	import MenuGeneric from "@/components/menus/MenuGeneric.svelte";
	import RadioGroup from "@/components/ui/input/selectgroup/RadioGroup.svelte";
	import { MapLibre } from "svelte-maplibre";
	import SelectGroupItem from "@/components/ui/input/selectgroup/SelectGroupItem.svelte";
	import { mode } from "mode-watcher";
	import { setThemeMode } from "@/lib/services/themeMode";
	import { getLocale, setLocale } from "@/lib/paraglide/runtime";
	import { getMapStyle } from "@/lib/utils/mapStyle";

	export const languages = [
		{
			label: m.language_english(),
			value: "en"
		},
		{
			label: m.language_german(),
			value: "de"
		},
		{
			label: m.language_spanish(),
			value: "es"
		},
		{
			label: m.language_portuguese(),
			value: "pt"
		}
	];
</script>

<MenuCard
	title={m.settings_appearance()}
	Icon={Paintbrush}
>
	<Select
		title={m.settings_language()}
		value={getLocale()}
		onselect={(locale) => setLocale(locale)}
		options={languages}
	/>

	{#if !isMenuSidebar()}
		<Toggle
			title={m.settings_left_handed_mode_title()}
			description={m.settings_left_handed_mode_description()}
			onclick={() => onSettingsChange("isLeftHanded", !getUserSettings().isLeftHanded)}
			value={getUserSettings().isLeftHanded}
		/>
	{/if}

	<MenuGeneric title={m.settings_theme()}>
		<RadioGroup
			value={mode.current}
			onValueChange={setThemeMode}
			class="self-center"
		>
			<SelectGroupItem class="p-4" value="light">
				<Sun size="20" />
				{m.theme_light()}
			</SelectGroupItem>
			<SelectGroupItem class="p-4" value="system">
				<Cloud size="20" />
				{m.theme_system()}
			</SelectGroupItem>
			<SelectGroupItem class="p-4" value="dark">
				<Moon size="20" />
				{m.theme_dark()}
			</SelectGroupItem>
		</RadioGroup>
	</MenuGeneric>

	<MenuGeneric title={m.settings_map_style()}>
		<RadioGroup
			childCount={getConfig().mapStyles.length}
			value={getUserSettings().mapStyle.id}
			onValueChange={onMapStyleChange}
			class="self-center"
		>
			{#each getConfig().mapStyles as mapStyle (mapStyle.id)}
				<SelectGroupItem class="overflow-hidden" value={mapStyle.id}>
					<MapLibre
						center={[
							getConfig().mapPositions.styleLon ?? 9.979,
							getConfig().mapPositions.styleLat ?? 53.563
						]}
						zoom={getConfig().mapPositions.styleZoom ?? 12}
						filterLayers={l => l.type !== "symbol"}
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
	</MenuGeneric>

	<MenuGeneric title={m.settings_icon_size()}>
		<SliderSteps
			value={getUserSettings().mapIconSize}
			onchange={value => onSettingsChange("mapIconSize", value)}
			steps={[0.75, 1, 1.25, 1.5]}
			labels={{
					0.75: "S",
					1: "M",
					1.25: "L",
					1.5: "XL"
				}}
		/>
	</MenuGeneric>

</MenuCard>
