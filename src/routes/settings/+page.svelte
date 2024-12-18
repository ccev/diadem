<script lang="ts">
	import BottomNavWrapper from '@/components/ui/nav/BottomNavWrapper.svelte';
	import BottomNavSpacing from '@/components/ui/nav/BottomNavSpacing.svelte';
	import Button from '@/components/ui/Button.svelte';
	import { getUserSettings, updateUserSettings } from '@/lib/userSettings.svelte';
	import { Cloud, Moon, Paintbrush, Sun, Image } from 'lucide-svelte';
	import Switch from '@/components/ui/settings/Switch.svelte';
	import SelectGroup from '@/components/ui/settings/SelectGroup.svelte';
	import SelectGroupItem from '@/components/ui/settings/SelectGroupItem.svelte';
	import SettingsCard from '@/components/ui/settings/SettingsCard.svelte';
	import { getIconPokemon, getIconPokestop, getUiconSetDetails } from '@/lib/uicons.svelte';
	import {getConfig} from '@/lib/config';
	import { isModalOpen } from '@/lib/modal.svelte';
	import { MapLibre } from 'svelte-maplibre';
	import maplibre from 'maplibre-gl';

	$effect(() => {
		getUserSettings()
		updateUserSettings()
	})

	function onThemeChange(value: string) {
		if (value === "true") {
			getUserSettings().isDarkMode = true
		} else if (value === "false") {
			getUserSettings().isDarkMode = false
		} else {
			getUserSettings().isDarkMode = null
		}
	}

	function onIconChange(iconSetId: string, iconType: string) {
		const iconSet = getUiconSetDetails(iconSetId)
		if (!iconSet) return

		getUserSettings().uiconSet.id = iconSet.id
		getUserSettings().uiconSet.url = iconSet.url
	}

	function onMapStyleChange(mapStyleId) {
		const mapStyle = getConfig().mapStyles.find(s => s.id === mapStyleId)
		if (!mapStyle) return

		getUserSettings().mapStyle.id = mapStyle.id
		getUserSettings().mapStyle.url = mapStyle.url
	}
</script>

<div class="mt-2 mx-auto max-w-[30rem] space-y-4">
	<SettingsCard>
		{#snippet title()}
			<Paintbrush size="18" />
			Appearance
		{/snippet}

		<Button
			variant="ghost"
			size=""
			class="py-3 px-4 w-full flex justify-between items-center text-left"
			onclick={() => {getUserSettings().isLeftHanded = !getUserSettings().isLeftHanded}}
		>
			<div>
				<p class="font-semibold text-base">
					Left-handed mode
				</p>
				<p class="font-normal text-sm">
					Place UI elements on the left
				</p>
			</div>

			<Switch
				checked={getUserSettings().isLeftHanded}
			/>
		</Button>
		<div class="py-3 px-4 w-full flex flex-col gap-2">
			<div>
				<p class="font-semibold">
					Theme
				</p>
			</div>

			<SelectGroup
				value={"" + getUserSettings().isDarkMode}
				onValueChange={onThemeChange}
			>
				<SelectGroupItem value="false">
					<Sun size="20" />
					Light
				</SelectGroupItem>
				<SelectGroupItem value="null">
					<Cloud size="20" />
					System
				</SelectGroupItem>
				<SelectGroupItem value="true">
					<Moon size="20" />
					Dark
				</SelectGroupItem>
			</SelectGroup>
		</div>
		<div class="py-3 px-4 w-full flex flex-col gap-2">
			<div>
				<p class="font-semibold">
					Map Style
				</p>
			</div>

			<SelectGroup
				value={getUserSettings().mapStyle.id}
				onValueChange={onMapStyleChange}
			>
				{#each getConfig().mapStyles as mapStyle (mapStyle.id)}
					<SelectGroupItem class="p-0 overflow-hidden" value={mapStyle.id}>
						<MapLibre
							center={[9.979, 53.563]}
							zoom={12}
							class="w-20 h-[4.5rem] border-b-2 border-accent"
							style={mapStyle.url}
							attributionControl={false}
							interactive={false}
						/>
						<span class="pb-1">
							{mapStyle.name}
						</span>

					</SelectGroupItem>
				{/each}
			</SelectGroup>

		</div>
	</SettingsCard>

	<SettingsCard>
		{#snippet title()}
			<Image size="18" />
			Icons
		{/snippet}

		<div class="py-3 px-4 w-full flex flex-col gap-2">
			<div>
				<p class="font-semibold">
					Pokemon
				</p>
			</div>

			<SelectGroup
				childCount={getConfig().uiconSets.length}
				value={getUserSettings().uiconSet.id}
				onValueChange={(value) => onIconChange(value, "pokemon")}
			>
				{#each getConfig().uiconSets as iconSet (iconSet.id)}
					<SelectGroupItem value={iconSet.id}>
						<img
							class="w-5"
							src={getIconPokemon({pokemon_id: 25}, iconSet.id)}
							alt="Pokemon"
						>
						{iconSet.name}
					</SelectGroupItem>
				{/each}
			</SelectGroup>

		</div>
		<div class="py-3 px-4 w-full flex flex-col gap-2">
			<div>
				<p class="font-semibold">
					Pokestops
				</p>
			</div>

			<SelectGroup
				childCount={getConfig().uiconSets.length}
				value={getUserSettings().uiconSet.id}
				onValueChange={(value) => onIconChange(value, "pokemon")}
			>
				{#each getConfig().uiconSets as iconSet (iconSet.id)}
					<SelectGroupItem value={iconSet.id}>
						<img
							class="w-5"
							src={getIconPokestop({}, iconSet.id)}
							alt="Pokemon"
						>
						{iconSet.name}
					</SelectGroupItem>
				{/each}
			</SelectGroup>

		</div>
	</SettingsCard>
</div>




<BottomNavSpacing />
<BottomNavWrapper page="/settings" />

