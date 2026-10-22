<script lang="ts">
	import FilterSection from "@/components/menus/filters/FilterSection.svelte";
	import SignInButton from "@/components/ui/user/SignInButton.svelte";
	import { mapObjectLabels } from "@/lib/mapObjects/mapObjectLabels";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import { featureFamily, Features } from "@/lib/utils/features";
</script>

<div
	class="space-y-2 mb-0.5 overflow-x-hidden"
	style="container-name: menu; container-type: inline-size"
>
	<SignInButton />
	<FilterSection
		requiredPermission={featureFamily[MapObjectType.POKEMON]}
		title={mapObjectLabels[MapObjectType.POKEMON]()}
		category="pokemon"
		mapObject={MapObjectType.POKEMON}
		filterModal="filtersetPokemon"
	/>

	<FilterSection
		requiredPermission={Features.POKESTOP}
		title={mapObjectLabels[MapObjectType.POKESTOP]()}
		category="pokestop"
		mapObject={MapObjectType.POKESTOP}
		isFilterable={false}
		subCategories={[
			{
				title: "Plain Pokéstops",
				category: "pokestopPlain",
				requiredPermission: Features.POKESTOP,
				filterable: false
			},
			{
				title: "Quests",
				category: "quest",
				requiredPermission: Features.QUEST,
				filterModal: "filtersetQuest"
			},
			{
				title: "Team Rocket",
				category: "invasion",
				requiredPermission: Features.INVASION,
				filterModal: "filtersetInvasion"
			},
			{ title: "Lures", category: "lure", requiredPermission: Features.LURE, filterable: false },
			{
				title: "Showcases",
				category: "contest",
				requiredPermission: Features.CONTEST,
				filterable: false
			},
			{
				title: "Kecleon",
				category: "kecleon",
				requiredPermission: Features.KECLEON,
				filterable: false
			},
			{
				title: "Golden Pokéstops",
				category: "goldPokestop",
				requiredPermission: Features.GOLDEN_POKESTOP,
				filterable: false
			}
		]}
	/>

	<FilterSection
		requiredPermission={Features.GYM}
		title={mapObjectLabels[MapObjectType.GYM]()}
		category="gym"
		mapObject={MapObjectType.GYM}
		isFilterable={false}
		subCategories={[
			{
				title: "Plain Gyms",
				category: "gymPlain",
				requiredPermission: Features.GYM,
				filterable: false
			},
			{
				title: "Raids",
				category: "raid",
				requiredPermission: Features.RAID,
				filterModal: "filtersetRaid"
			}
		]}
	/>

	<FilterSection
		requiredPermission={Features.ROUTE}
		title="Routes"
		category="route"
		mapObject={MapObjectType.ROUTE}
		isFilterable={false}
	/>

	<FilterSection
		requiredPermission={Features.STATION}
		title={mapObjectLabels[MapObjectType.STATION]()}
		category={MapObjectType.STATION}
		mapObject={MapObjectType.STATION}
		isFilterable={false}
		subCategories={[
			{
				title: "Plain Power Spots",
				category: "stationPlain",
				requiredPermission: Features.STATION,
				filterable: false
			},
			{
				title: "Max Battles",
				category: "maxBattle",
				requiredPermission: Features.MAX_BATTLE,
				filterModal: "filtersetMaxBattle"
			}
		]}
	/>

	<FilterSection
		requiredPermission={MapObjectType.NEST}
		title={mapObjectLabels[MapObjectType.NEST]()}
		mapObject={MapObjectType.NEST}
		category="nest"
		isFilterable={false}
	/>

	<FilterSection
		requiredPermission={MapObjectType.TAPPABLE}
		title={mapObjectLabels[MapObjectType.TAPPABLE]()}
		mapObject={MapObjectType.TAPPABLE}
		category="tappable"
		isFilterable={false}
	/>

	<FilterSection
		requiredPermission={MapObjectType.S2_CELL}
		title={mapObjectLabels[MapObjectType.S2_CELL]()}
		mapObject={MapObjectType.S2_CELL}
		category="s2cell"
		isFilterable={false}
	/>

	<FilterSection
		requiredPermission={MapObjectType.SPAWNPOINT}
		title={mapObjectLabels[MapObjectType.SPAWNPOINT]()}
		mapObject={MapObjectType.SPAWNPOINT}
		category="spawnpoint"
		isFilterable={false}
	/>
</div>
