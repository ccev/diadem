<script lang="ts">
	import { getConfig } from '@/lib/services/config/config';
	import * as m from '@/lib/paraglide/messages';
	import Card from '@/components/ui/Card.svelte';
	import { getUserSettings, updateUserSettings } from '@/lib/services/userSettings.svelte.js';
	import { ChevronDown, ChevronUp, Eye, EyeOff, Filter, Plus } from 'lucide-svelte';
	import MenuGeneric from '@/components/menus/MenuGeneric.svelte';
	import Button from '@/components/ui/input/Button.svelte';
	import { getIconPokemon } from '@/lib/services/uicons.svelte.js';
	import Switch from '@/components/ui/input/Switch.svelte';
	import FilterControl from '@/components/menus/filters/FilterControl.svelte';

	import { slide } from 'svelte/transition';
	import Select from '@/components/ui/input/Select.svelte';
	import { hasFeatureAnywhere } from '@/lib/services/user/checkPerm';
	import { getUserDetails } from '@/lib/services/user/userDetails.svelte';
	import Metadata from '@/components/utils/Metadata.svelte';
	import FilterSection from '@/components/menus/filters/FilterSection.svelte';
	import PokemonFilterset from '@/components/menus/filters/filterset/pokemon/PokemonFilterset.svelte';
	import PlainPokestopFilterset from '@/components/menus/filters/filterset/plainPokestop/PlainPokestopFilterset.svelte';
	import QuestFilterset from '@/components/menus/filters/filterset/quest/QuestFilterset.svelte';

	let test: boolean = $state(false);

	function onS2CellChange(value) {
		getUserSettings().filters.s2cell.filters.levels = [value];
		updateUserSettings();
	}
</script>

<svelte:head>
	<Metadata title={m.nav_filters()} />
</svelte:head>

<PokemonFilterset />
<PlainPokestopFilterset />
<QuestFilterset />

<div class="mt-2 space-y-2 mb-0.5" style="container-name: menu; container-type: inline-size">
	<FilterSection
		requiredPermission="pokemon"
		title="Pokémon"
		category="pokemon"
	/>

	<FilterSection
		requiredPermission="pokestop"
		title="Pokéstops"
		category="pokestopMajor"
		isFilterable={false}
		subCategories={[
			{ title: "Plain Pokéstops", category: "pokestopPlain", filterable: false },
			{ title: "Quests", category: "quest" },
			{ title: "Team Rocket", category: "invasion" },
			{ title: "Lures", category: "lure", filterable: false },
			{ title: "Showcases", category: "contest", filterable: false },
			{ title: "Routes", category: "route", filterable: false },
			{ title: "Kecleon", category: "kecleon", filterable: false },
			{ title: "Golden Pokéstops", category: "goldPokestop", filterable: false },
		]}
	/>

	<FilterSection
		requiredPermission="gym"
		title="Gyms"
		category="gymMajor"
		isFilterable={false}
		subCategories={[
			{ title: "Plain Gyms", category: "gymPlain" },
			{ title: "Raids", category: "raid" },
		]}
	/>

	<FilterSection
		requiredPermission="station"
		title="Power Spots"
		category="stationMajor"
		isFilterable={false}
		subCategories={[
			{ title: "Plain Power Spots", category: "stationPlain" },
			{ title: "Max Battles", category: "maxBattle" },
		]}
	/>

	<!--{#if hasFeatureAnywhere(getUserDetails().permissions, "s2cell")}-->
	<!--	<Card class="pt-4 pb-2 px-2">-->
	<!--		<MenuGeneric title="S2 Cells">-->
	<!--			<FilterTypeSelect category="s2cell" />-->

	<!--			{#if getUserSettings().filters.s2cell.type === "all"}-->
	<!--				<Select-->
	<!--					onselect={onS2CellChange}-->
	<!--					value={getUserSettings().filters.s2cell.filters.levels[0]}-->
	<!--					title="Level"-->
	<!--					options={[-->
	<!--					{ value: 10, label: "Level 10" },-->
	<!--					{ value: 15, label: "Level 15" },-->
	<!--					{ value: 16, label: "Level 16" },-->
	<!--					{ value: 17, label: "Level 17" },-->
	<!--					{ value: 18, label: "Level 18" },-->
	<!--				]}-->
	<!--				/>-->
	<!--			{/if}-->
	<!--		</MenuGeneric>-->
	<!--	</Card>-->
	<!--{/if}-->
</div>
