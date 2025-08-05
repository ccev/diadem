<script lang="ts">
	import { getDefaultIconSet, getUserSettings, updateUserSettings } from '@/lib/userSettings.svelte';
	import { Cloud, Code, Image, Moon, Paintbrush, Sun } from 'lucide-svelte';
	import SettingsCard from '@/components/menus/profile/SettingsCard.svelte';
	import {
		getIconGym,
		getIconPokemon,
		getIconPokestop,
		getIconStation,
		getUiconSetDetails
	} from '@/lib/uicons.svelte';
	import { getConfig } from '@/lib/config/config';
	import { MapLibre } from 'svelte-maplibre';
	import type { MapObjectType } from '@/lib/types/mapObjectData/mapObjects';
	import SettingsToggle from '@/components/menus/profile/SettingsToggle.svelte';
	import SettingsNumber from '@/components/menus/profile/SettingsNumber.svelte';
	import SettingsGeneric from '@/components/menus/profile/SettingsGeneric.svelte';
	import * as m from '@/lib/paraglide/messages';
	import SettingsSelect from '@/components/menus/profile/SettingsSelect.svelte';
	import { deleteAllFeaturesOfType, updateFeatures } from '@/lib/map/featuresGen.svelte.js';
	import RadioGroup from '@/components/ui/basic/RadioGroup.svelte';
	import SettingsRadioGroupItem from '@/components/menus/profile/SettingsRadioGroupItem.svelte';
	import { getUserDetails } from '@/lib/user/userDetails.svelte';
	import type { PageProps } from './$types';
	import ProfileCard from '@/components/ui/user/ProfileCard.svelte';
	import { isSupportedFeature } from '@/lib/enabledFeatures';
	import { isMenuSidebar, openMenu } from '@/lib/menus.svelte';
	import CloseButton from '@/components/ui/CloseButton.svelte';
	import { getMap } from '@/lib/map/map.svelte';
	import { getMapObjects } from '@/lib/mapObjects/mapObjectsState.svelte';
	import { tick } from 'svelte';
	import { clearSessionImageUrls } from '@/lib/map/featuresManage.svelte';
	import SettingsSlider from '@/components/menus/profile/SettingsSlider.svelte';
	import { AVAILABLE_LANGUAGES } from '@/lib/constants';

	// $effect(() => {
	// 	getUserSettings()
	// 	updateUserSettings()
	// })
	// TODO: explicit updateUserSettings everywhere

	type Language = {
		label: string
		value: string
	}
	const languages: Language[] =  [
		{
			label: m.language_auto(),
			value: "auto"
		},
		...AVAILABLE_LANGUAGES
	]

	function onThemeChange(value: string) {
		if (value === "true") {
			getUserSettings().isDarkMode = true
		} else if (value === "false") {
			getUserSettings().isDarkMode = false
		} else {
			getUserSettings().isDarkMode = null
		}
		updateUserSettings()
	}

	function onIconChange(iconSetId: string, iconType: MapObjectType) {
		const iconSet = getUiconSetDetails(iconSetId)
		if (!iconSet) return

		getUserSettings().uiconSet[iconType].id = iconSet.id
		getUserSettings().uiconSet[iconType].url = iconSet.url
		deleteAllFeaturesOfType(iconType)
	}

	function getUiconSets(type: MapObjectType) {
		const allSets = getConfig().uiconSets.filter(s => s[type])
		const defaultSetId = getDefaultIconSet(type)
		const index = allSets.findIndex(s => s.id === defaultSetId.id)
		if (index > 0) {
			const [defaultSet] = allSets.splice(index, 1)
			allSets.unshift(defaultSet)
		}
		return allSets.map(s => {return {
			value: s.id,
			label: s.id === defaultSetId.id ? m.default_() : (s[type]?.name ?? s.name)
		}})
	}

	function onMapStyleChange(mapStyleId) {
		const mapStyle = getConfig().mapStyles.find(s => s.id === mapStyleId)
		if (!mapStyle) return

		getUserSettings().mapStyle.id = mapStyle.id
		getUserSettings().mapStyle.url = mapStyle.url
		updateUserSettings()

		setTimeout(() => {
			clearSessionImageUrls()
			updateFeatures(getMapObjects())
		}, 1000)  // TODO: properly handle this using an event
	}
</script>

{#snippet iconSelect(title, type, getIconFunc, getIconParams)}
	{#if getUiconSets(type).length > 1}
		<SettingsGeneric {title}>
			<RadioGroup
				childCount={getUiconSets(type).length}
				value={getUserSettings().uiconSet[type].id}
				onValueChange={(value) => onIconChange(value, type)}
				evenColumns={false}
			>
				{#each getUiconSets(type) as iconSet (iconSet.value)}
					<SettingsRadioGroupItem class="p-4" value={iconSet.value}>
						<img
							class="w-5"
							src={getIconFunc(getIconParams, iconSet.value)}
							alt="{title} (Style: {iconSet.label})"
						>
						{iconSet.label}
					</SettingsRadioGroupItem>
				{/each}
			</RadioGroup>
		</SettingsGeneric>
	{/if}
{/snippet}

<div class="space-y-2 mt-2" style="container-name: menu-container; container-type: inline-size">
	{#if isSupportedFeature("auth")}
		<ProfileCard />
	{/if}

	<SettingsCard>
		{#snippet title()}
			<Paintbrush size="18" />
			{m.settings_appearance()}
		{/snippet}

		<SettingsSelect
			title={m.settings_language()}
			description=""
			value={getUserSettings().languageTag}
			onselect={(tag) => getUserSettings().languageTag = tag}
			options={languages}
		/>

		{#if !isMenuSidebar()}
			<SettingsToggle
				title={m.settings_left_handed_mode_title()}
				description={m.settings_left_handed_mode_description()}
				onclick={() => {getUserSettings().isLeftHanded = !getUserSettings().isLeftHanded}}
				value={getUserSettings().isLeftHanded}
			/>
		{/if}

		<SettingsGeneric title={m.settings_theme()}>
			<RadioGroup
				value={"" + getUserSettings().isDarkMode}
				onValueChange={onThemeChange}
				class="self-center"
			>
				<SettingsRadioGroupItem class="p-4" value="false">
					<Sun size="20" />
					{m.theme_light()}
				</SettingsRadioGroupItem>
				<SettingsRadioGroupItem class="p-4" value="null">
					<Cloud size="20" />
					{m.theme_system()}
				</SettingsRadioGroupItem>
				<SettingsRadioGroupItem class="p-4" value="true">
					<Moon size="20" />
					{m.theme_dark()}
				</SettingsRadioGroupItem>
			</RadioGroup>
		</SettingsGeneric>

		<SettingsGeneric title={m.settings_map_style()}>
			<RadioGroup
				childCount={getConfig().mapStyles.length}
				value={getUserSettings().mapStyle.id}
				onValueChange={onMapStyleChange}
				class="self-center"
			>
				{#each getConfig().mapStyles as mapStyle (mapStyle.id)}
					<SettingsRadioGroupItem class="overflow-hidden" value={mapStyle.id}>
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

					</SettingsRadioGroupItem>
				{/each}
			</RadioGroup>
		</SettingsGeneric>

		<SettingsGeneric title={m.settings_icon_size()}>
			<SettingsSlider
				value={getUserSettings().mapIconSize}
				onchange={value => getUserSettings().mapIconSize = value}
				steps={[0.75, 1, 1.25, 1.5]}
				labels={{
					0.75: "S",
					1: "M",
					1.25: "L",
					1.5: "XL"
				}}
			/>
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
		{@render iconSelect(m.pogo_stations(), "station", getIconStation, {})}
	</SettingsCard>

	<SettingsCard>
		{#snippet title()}
			<Code size="18" />
			{m.settings_advanced()}
		{/snippet}

		<SettingsToggle
			title={m.settings_show_debug_title()}
			description={m.settings_show_debug_description()}
			onclick={() => {getUserSettings().showDebugMenu = !getUserSettings().showDebugMenu}}
			value={getUserSettings().showDebugMenu}
		/>

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
