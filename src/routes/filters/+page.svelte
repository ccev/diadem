<script lang="ts">
	import BottomNavWrapper from '@/components/ui/nav/BottomNavWrapper.svelte';
	import BottomNavSpacing from '@/components/ui/nav/BottomNavSpacing.svelte';
	import { getConfig } from '@/lib/config';
	import * as m from '@/lib/paraglide/messages';
	import Card from '@/components/ui/Card.svelte';
	import { getUserSettings, updateUserSettings } from '@/lib/userSettings.svelte';
	import { Cloud, Eye, EyeOff, Filter, Moon, Pen, Pencil, Plus, Sun, X } from 'lucide-svelte';
	import SelectGroupItem from '@/components/ui/settings/SelectGroupItem.svelte';
	import SelectGroup from '@/components/ui/settings/SelectGroup.svelte';
	import SettingsGeneric from '@/components/ui/settings/SettingsGeneric.svelte';
	import Button from '@/components/ui/Button.svelte';
	import { getIconPokemon } from '@/lib/uicons.svelte';
	import Switch from '@/components/ui/settings/Switch.svelte';
	import Map from '@/components/map/Map.svelte';
	import FilterTypeSelect from '@/components/ui/filters/FilterTypeSelect.svelte';

	import { slide, fly } from 'svelte/transition';
</script>

<svelte:head>
	<title>{getConfig().general.mapName} | {m.nav_filters()}</title>
</svelte:head>

{#snippet showWhat()}
	<FilterTypeSelect category="pokestopMajor">
	</FilterTypeSelect>
<!--	<div class="grid grid-cols-3 gap-2">-->
<!--		<Button variant="outline">-->
<!--			<Eye size="16" />-->
<!--			<span>All</span>-->
<!--		</Button>-->
<!--		<Button variant="outline">-->
<!--			<EyeOff size="16" />-->
<!--			<span>None</span>-->
<!--		</Button>-->
<!--		<Button variant="outline">-->
<!--			<Filter size="16" />-->
<!--			<span>Filtered</span>-->
<!--		</Button>-->
<!--	</div>-->
{/snippet}

{#snippet showWhat2()}
	<div class="grid grid-cols-3 gap-2">
		<Button variant="outline">
			<Eye size="16" />
			<span>All</span>
		</Button>
		<Button variant="outline">
			<EyeOff size="16" />
			<span>None</span>
		</Button>
		<Button variant="outline">
			<Filter size="16" />
			<span>Filtered</span>
		</Button>
	</div>
{/snippet}
<!--{#snippet showWhat()}-->
<!--	<SelectGroup-->
<!--		value={"" + getUserSettings().isDarkMode}-->
<!--		onValueChange={() => {}}-->
<!--		class="self-center"-->
<!--	>-->
<!--		<SelectGroupItem class="p-4" value="false">-->
<!--			<Eye size="20" />-->
<!--			All-->
<!--		</SelectGroupItem>-->
<!--		<SelectGroupItem class="p-4" value="null">-->
<!--			<EyeOff size="20" />-->
<!--			None-->
<!--		</SelectGroupItem>-->
<!--		<SelectGroupItem class="p-4" value="true">-->
<!--			<Filter size="20" />-->
<!--			Filtered-->
<!--		</SelectGroupItem>-->
<!--	</SelectGroup>-->
<!--{/snippet}-->

<div class="mt-2 mx-auto max-w-[30rem]">
	<Card class="pt-4 pb-2 px-2 mx-2 mb-4">
		<SettingsGeneric title="Pokémon">
			<FilterTypeSelect category="pokemonMajor" />

			{#if getUserSettings().filters.pokemonMajor.type === "filtered"}
				<div class="w-full flex flex-col gap-2" transition:slide={{ duration: 90 }}>
					<Button variant="outline" size="" class="px-2 py-2 border-2 rounded-md gap-2">
						<span>💯</span>
						<span>100% IV</span>
						<Switch class="ml-auto" checked={true} />
					</Button>
					<Button variant="outline" size="" class="px-2 py-2 border-2 rounded-md gap-2">
						<span>🔍</span>
						<span>Unown, Mesprit, Azelf, Tyranit...</span>
						<Switch class="ml-auto" checked={true} />
					</Button>
					<Button variant="outline" size="" class="px-2 py-2 border-2 rounded-md gap-2">
						<img class="w-5 h-5" alt="Pikachu Icon" src={getIconPokemon({ pokemon_id: 25 })}>
						<span>97%+ IV Pikachu</span>
						<Switch class="ml-auto" checked={true} />
					</Button>
					<Button variant="outline" size="" class="px-2 py-2 border-2 rounded-md gap-2">
						<span>🏆</span>
						<span>Rank 1 Great League</span>
						<Switch class="ml-auto" checked={true} />
					</Button>
					<Button variant="secondary">
						<Plus size="16" />
						<span>Add Filterset</span>
					</Button>
				</div>
			{/if}
		</SettingsGeneric>
	</Card>
	<Card class="pt-4 pb-2 px-2 mx-2 mb-4">
		<SettingsGeneric title="Plain Pokéstops">
			<FilterTypeSelect category="pokestopPlain" />
		</SettingsGeneric>
		<SettingsGeneric title="Quests">
			{@render showWhat()}
		</SettingsGeneric>
		<SettingsGeneric title="Team Rocket">
			{@render showWhat()}
		</SettingsGeneric>
		<SettingsGeneric title="Showcases">
			{@render showWhat()}
		</SettingsGeneric>
		<SettingsGeneric title="Lures">
			{@render showWhat()}
		</SettingsGeneric>
	</Card>
	<Card class="pt-4 pb-2 px-2 mx-2">
		<SettingsGeneric title="Plain Gyms">
			<FilterTypeSelect category="gymPlain" />
		</SettingsGeneric>
		<SettingsGeneric title="Raids">
			{@render showWhat()}
		</SettingsGeneric>
	</Card>
	<Card class="pt-4 pb-2 px-2 mx-2">
		<SettingsGeneric title="Plain Power Stations">
			<FilterTypeSelect category="stationMajor" />
		</SettingsGeneric>
	</Card>
</div>

<BottomNavSpacing />
<BottomNavWrapper page="/filters" />

