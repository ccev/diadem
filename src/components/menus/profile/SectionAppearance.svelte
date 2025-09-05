<script lang="ts">
	import * as m from '@/lib/paraglide/messages';
	import { Cloud, Moon, Paintbrush, Sun } from 'lucide-svelte';
	import { getUserSettings } from '@/lib/services/userSettings.svelte';
	import { isMenuSidebar } from '@/lib/utils/device';
	import { onMapStyleChange, onSettingsChange, onThemeChange } from '@/lib/services/settings';
	import { getConfig } from '@/lib/services/config/config';
	import MenuCard from '@/components/menus/MenuCard.svelte';
	import VerticalRadioGroupItem from '@/components/ui/input/VerticalRadioGroupItem.svelte';
	import Slider from '@/components/ui/input/Slider.svelte';
	import Toggle from '@/components/ui/input/Toggle.svelte';
	import Select from '@/components/ui/input/Select.svelte';
	import MenuGeneric from '@/components/menus/MenuGeneric.svelte';
	import RadioGroup from '@/components/ui/input/RadioGroup.svelte';
	import { MapLibre } from 'svelte-maplibre';
	import { AVAILABLE_LANGUAGES } from '@/lib/constants';

	type Language = {
		label: string
		value: string
	}

	const languages: Language[] = [
		{
			label: m.language_auto(),
			value: 'auto'
		},
		...AVAILABLE_LANGUAGES
	];
</script>

<MenuCard
	title={m.settings_appearance()}
	Icon={Paintbrush}
>
	<Select
		title={m.settings_language()}
		value={getUserSettings().languageTag}
		onselect={(tag) => onSettingsChange("languageTag", tag)}
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
			value={"" + getUserSettings().isDarkMode}
			onValueChange={onThemeChange}
			class="self-center"
		>
			<VerticalRadioGroupItem class="p-4" value="false">
				<Sun size="20" />
				{m.theme_light()}
			</VerticalRadioGroupItem>
			<VerticalRadioGroupItem class="p-4" value="null">
				<Cloud size="20" />
				{m.theme_system()}
			</VerticalRadioGroupItem>
			<VerticalRadioGroupItem class="p-4" value="true">
				<Moon size="20" />
				{m.theme_dark()}
			</VerticalRadioGroupItem>
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
				<VerticalRadioGroupItem class="overflow-hidden" value={mapStyle.id}>
					<MapLibre
						center={[9.979, 53.563]}
						zoom={12}
						class="w-20 h-[4.5rem] border-b-2 border-accent"
						style={mapStyle.url}
						attributionControl={false}
						interactive={false}
						zoomOnDoubleClick={false}
					/>
					<span class="pb-1">
							{mapStyle.name}
						</span>

				</VerticalRadioGroupItem>
			{/each}
		</RadioGroup>
	</MenuGeneric>

	<MenuGeneric title={m.settings_icon_size()}>
		<Slider
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