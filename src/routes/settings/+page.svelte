<script lang="ts">
	import BottomNavWrapper from '@/components/ui/nav/BottomNavWrapper.svelte';
	import BottomNavSpacing from '@/components/ui/nav/BottomNavSpacing.svelte';
	import Button from '@/components/ui/Button.svelte';
	import { getUserSettings, updateUserSettings } from '@/lib/userSettings.svelte';
	import { Cloud, Moon, Paintbrush, Sun, Image, Code } from 'lucide-svelte';
	import Switch from '@/components/ui/settings/Switch.svelte';
	import SelectGroup from '@/components/ui/settings/SelectGroup.svelte';
	import SelectGroupItem from '@/components/ui/settings/SelectGroupItem.svelte';
	import SettingsCard from '@/components/ui/settings/SettingsCard.svelte';
	import { getIconGym, getIconPokemon, getIconPokestop, getUiconSetDetails } from '@/lib/uicons.svelte';
	import {getConfig} from '@/lib/config';
	import { isModalOpen } from '@/lib/modal.svelte';
	import { MapLibre } from 'svelte-maplibre';
	import maplibre from 'maplibre-gl';
	import type { MapObjectType } from '@/lib/types/mapObjectData/mapObjects';
	import Input from '@/components/ui/settings/Input.svelte';
	import SettingsToggle from '@/components/ui/settings/SettingsToggle.svelte';
	import SettingsNumber from '@/components/ui/settings/SettingsNumber.svelte';
	import SettingsSettingTitle from '@/components/ui/settings/SettingsSettingTitle.svelte';
	import SettingsGeneric from '@/components/ui/settings/SettingsGeneric.svelte';
	import * as m from "@/lib/paraglide/messages"
	import {availableLanguageTags} from '@/lib/paraglide/runtime';
	import SettingsSelect from '@/components/ui/settings/SettingsSelect.svelte';

	$effect(() => {
		getUserSettings()
		updateUserSettings()
	})

	type Language = {
		label: string
		shortLabel?: string
		value: string
	}
	const languages: Language[] = [
		{
			label: "Auto",
			value: "auto"
		},
		{
			label: "English",
			value: "en"
		},
		{
			label: "German",
			value: "de"
		}
	]

	function onThemeChange(value: string) {
		if (value === "true") {
			getUserSettings().isDarkMode = true
		} else if (value === "false") {
			getUserSettings().isDarkMode = false
		} else {
			getUserSettings().isDarkMode = null
		}
	}

	function onIconChange(iconSetId: string, iconType: MapObjectType) {
		const iconSet = getUiconSetDetails(iconSetId)
		if (!iconSet) return

		getUserSettings().uiconSet[iconType].id = iconSet.id
		getUserSettings().uiconSet[iconType].url = iconSet.url
	}

	function getUiconSets(type: MapObjectType) {
		return getConfig().uiconSets.filter(s => s.use.includes(type))
	}

	function onMapStyleChange(mapStyleId) {
		const mapStyle = getConfig().mapStyles.find(s => s.id === mapStyleId)
		if (!mapStyle) return

		getUserSettings().mapStyle.id = mapStyle.id
		getUserSettings().mapStyle.url = mapStyle.url
	}
</script>

{#snippet iconSelect(title, type, getIconFunc, getIconParams)}
	<SettingsGeneric {title}>
		<SelectGroup
			childCount={getUiconSets(type).length}
			value={getUserSettings().uiconSet[type].id}
			onValueChange={(value) => onIconChange(value, type)}
			evenColumns={false}
		>
			{#each getUiconSets(type) as iconSet (iconSet.id)}
				<SelectGroupItem class="p-4" value={iconSet.id}>
					<img
						class="w-5"
						src={getIconFunc(getIconParams, iconSet.id)}
						alt="{title} (Style: {iconSet.name})"
					>
					{iconSet.name}
				</SelectGroupItem>
			{/each}
		</SelectGroup>
	</SettingsGeneric>
{/snippet}

<div class="mt-2 mx-auto max-w-[30rem] space-y-4">
	<SettingsCard>
		{#snippet title()}
			<Paintbrush size="18" />
			{m.settings_appearance()}
		{/snippet}

		<SettingsSelect
			title="Language"
			description=""
			value={getUserSettings().languageTag}
			onselect={(tag) => getUserSettings().languageTag = tag}
			options={languages}
		/>

		<SettingsToggle
			title={m.settings_left_handed_mode_title()}
			description={m.settings_left_handed_mode_description()}
			onclick={() => {getUserSettings().isLeftHanded = !getUserSettings().isLeftHanded}}
			value={getUserSettings().isLeftHanded}
		/>

		<SettingsGeneric title={m.settings_theme()}>
			<SelectGroup
				value={"" + getUserSettings().isDarkMode}
				onValueChange={onThemeChange}
				class="self-center"
			>
				<SelectGroupItem class="p-4" value="false">
					<Sun size="20" />
					{m.theme_light()}
				</SelectGroupItem>
				<SelectGroupItem class="p-4" value="null">
					<Cloud size="20" />
					{m.theme_system()}
				</SelectGroupItem>
				<SelectGroupItem class="p-4" value="true">
					<Moon size="20" />
					{m.theme_dark()}
				</SelectGroupItem>
			</SelectGroup>
		</SettingsGeneric>

		<SettingsGeneric title={m.settings_map_style()}>
			<SelectGroup
				childCount={getConfig().mapStyles.length}
				value={getUserSettings().mapStyle.id}
				onValueChange={onMapStyleChange}
				class="self-center"
			>
				{#each getConfig().mapStyles as mapStyle (mapStyle.id)}
					<SelectGroupItem class="overflow-hidden" value={mapStyle.id}>
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

					</SelectGroupItem>
				{/each}
			</SelectGroup>
		</SettingsGeneric>
	</SettingsCard>

	<SettingsCard>
		{#snippet title()}
			<Image size="18" />
			{m.settings_icons()}
		{/snippet}

		{@render iconSelect(m.pogo_pokemon(), "pokemon", getIconPokemon, {pokemon_id: 25})}
		{@render iconSelect(m.pogo_pokestops(), "pokestop", getIconPokestop, {})}
		{@render iconSelect(m.pogo_gyms(), "gym", getIconGym, {})}
	</SettingsCard>

	<SettingsCard>
		{#snippet title()}
			<Code size="18" />
			{m.settings_advanced()}
		{/snippet}

		<SettingsToggle
			title={m.settings_load_map_objects_while_moving_title()}
			description={m.settings_load_map_objects_while_moving_description()}
			onclick={() => {getUserSettings().loadMapObjectsWhileMoving = !getUserSettings().loadMapObjectsWhileMoving}}
			value={getUserSettings().loadMapObjectsWhileMoving}
		/>

		<SettingsNumber
			title={m.settings_load_map_objects_padding_title()}
			description={m.settings_load_map_objects_padding_description()}
			value={getUserSettings().loadMapObjectsPadding}
			onchange={e => getUserSettings().loadMapObjectsPadding = parseFloat(e.target.value) || 0}
			min="0"
			step="10"
		/>

	</SettingsCard>
</div>

<BottomNavSpacing />
<BottomNavWrapper page="/settings" />

