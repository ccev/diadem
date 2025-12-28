<script lang="ts">
	import * as m from "@/lib/paraglide/messages";
	import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte.js";
	import Metadata from "@/components/utils/Metadata.svelte";
	import FilterSection from "@/components/menus/filters/FilterSection.svelte";
	import SignInButton from "@/components/ui/user/SignInButton.svelte";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import { Features } from "@/lib/utils/features";

	let test: boolean = $state(false);

	function onS2CellChange(value) {
		getUserSettings().filters.s2cell.filters.levels = [value];
		updateUserSettings();
	}
</script>

<svelte:head>
	<Metadata title={m.nav_filters()} />
</svelte:head>

<div class="mt-2 space-y-2 mb-0.5" style="container-name: menu; container-type: inline-size">
	<SignInButton />
	<FilterSection
		requiredPermission="pokemon"
		title={m.pogo_pokemon()}
		category="pokemon"
		mapObject={MapObjectType.POKEMON}
		filterModal="filtersetPokemon"
	/>

	<FilterSection
		requiredPermission="pokestop"
		title={m.pogo_pokestops()}
		category="pokestop"
		mapObject={MapObjectType.POKESTOP}
		isFilterable={false}
		subCategories={[
			{ title: m.plain_pokestops(), category: "pokestopPlain", filterable: false },
			{ title: m.pogo_quests(), category: "quest", filterModal: "filtersetQuest" },
			{ title: m.pogo_invasion(), category: "invasion", filterModal: "filtersetInvasion" },
			{ title: m.lures(), category: "lure", filterable: false },
			{ title: m.contests(), category: "contest", filterable: false },
			{ title: m.kecleon(), category: "kecleon", filterable: false },
			{ title: m.golden_pokestops(), category: "goldPokestop", filterable: false },
		]}
	/>

	<FilterSection
		requiredPermission={MapObjectType.GYM}
		title={m.pogo_gyms()}
		category="gym"
		mapObject={MapObjectType.GYM}
		isFilterable={false}
		subCategories={[
			{ title: m.plain_gyms(), category: "gymPlain", filterable: false },
			{ title: m.raids(), category: "raid", filterModal: "filtersetRaid" },
		]}
	/>

	<FilterSection
		requiredPermission={MapObjectType.STATION}
		title={m.pogo_stations()}
		category={MapObjectType.STATION}
		mapObject={MapObjectType.STATION}
		isFilterable={false}
		subCategories={[
			{ title: m.plain_stations(), category: "stationPlain", filterable: false },
			{ title: m.max_battles(), category: "maxBattle", filterable: false },
		]}
	/>

	<FilterSection
		requiredPermission={MapObjectType.NEST}
		title={m.nests()}
		mapObject={MapObjectType.NEST}
		category="nest"
		isFilterable={true}
	/>

	<FilterSection
		requiredPermission={MapObjectType.TAPPABLE}
		title={m.tappables()}
		mapObject={MapObjectType.TAPPABLE}
		category="tappable"
		isFilterable={false}
	/>

	<FilterSection
		requiredPermission={MapObjectType.ROUTE}
		title={m.routes()}
		mapObject={MapObjectType.ROUTE}
		category="route"
		isFilterable={false}
	/>

	<FilterSection
		requiredPermission={MapObjectType.S2_CELL}
		title={m.s2_cells()}
		mapObject={MapObjectType.S2_CELL}
		category="s2cell"
		isFilterable={true}
	/>

	<FilterSection
		requiredPermission={MapObjectType.SPAWNPOINT}
		title={m.spawnpoints()}
		mapObject={MapObjectType.SPAWNPOINT}
		category="spawnpoint"
		isFilterable={false}
	/>
</div>
