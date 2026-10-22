<script lang="ts">
	import { Cloud, Moon, Paintbrush, Sun } from "@lucide/svelte";
	import { ExternalMapProvider, getUserSettings } from "@/lib/services/userSettings.svelte";
	import { isMenuSidebar } from "@/lib/utils/device";
	import { isNative } from "@/lib/native/runtime";
	import {
		getAvailableLanguages,
		getAvailableMapProviders,
		onMapStyleChange,
		onSettingsChange
	} from "@/lib/services/settings";
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
	import { getLocale } from "@/lib/i18n/locale";
	import { setLocale } from "@/lib/i18n/client";
	import { getMapStyle } from "@/lib/utils/mapStyle";
</script>

<MenuCard title="Appearance" Icon={Paintbrush}>
	<MenuGeneric title="Theme">
		<RadioGroup
			value={mode.current}
			onValueChange={setThemeMode as (value: string) => void}
			class="self-center justify-center"
		>
			<SelectGroupItem class="p-4" value="light">
				<Sun size="20" />
				Light
			</SelectGroupItem>
			<SelectGroupItem class="p-4" value="system">
				<Cloud size="20" />
				System
			</SelectGroupItem>
			<SelectGroupItem class="p-4" value="dark">
				<Moon size="20" />
				Dark
			</SelectGroupItem>
		</RadioGroup>
	</MenuGeneric>

	<MenuGeneric title="Map Style">
		<RadioGroup
			value={getUserSettings().mapStyle.id}
			onValueChange={onMapStyleChange}
			class="self-center justify-center"
		>
			{#each getConfig().mapStyles as mapStyle (mapStyle.id)}
				<SelectGroupItem class="overflow-hidden" value={mapStyle.id}>
					<MapLibre
						center={[
							getConfig().mapPositions?.styleLon ?? 9.979,
							getConfig().mapPositions?.styleLat ?? 53.563
						]}
						zoom={getConfig().mapPositions?.styleZoom ?? 12}
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
	</MenuGeneric>

	<MenuGeneric title="Map Icon Size">
		<SliderSteps
			value={getUserSettings().mapIconSize}
			onchange={(value) => onSettingsChange("mapIconSize", value)}
			steps={[0.75, 1, 1.25, 1.5]}
			labels={{
				0.75: "S",
				1: "M",
				1.25: "L",
				1.5: "XL"
			}}
		/>
	</MenuGeneric>

	{#if !isNative()}
		<Select
			class="py-3 px-4 "
			title="Navigate using"
			value={getUserSettings().externalMapProvider}
			onselect={(mapProvider) =>
				onSettingsChange("externalMapProvider", mapProvider as ExternalMapProvider)}
			options={getAvailableMapProviders()}
		/>
	{/if}

	<Select
		class="py-3 px-4 "
		title="Language"
		value={getLocale()}
		onselect={(locale) => setLocale(locale as Parameters<typeof setLocale>[0])}
		options={getAvailableLanguages()}
	/>

	{#if !isMenuSidebar()}
		<Toggle
			title="Left-handed Mode"
			description="Place UI elements on the left"
			onclick={() => onSettingsChange("isLeftHanded", !getUserSettings().isLeftHanded)}
			value={getUserSettings().isLeftHanded}
		/>
	{/if}
</MenuCard>
