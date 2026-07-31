<script lang="ts">
	import * as m from "@/lib/paraglide/messages";
	import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte.js";
	import FilterSection from "@/components/menus/filters/FilterSection.svelte";
	import SignInButton from "@/components/ui/user/SignInButton.svelte";
	import { mapObjectLabels } from "@/lib/mapObjects/mapObjectLabels";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import { featureFamily, Features } from "@/lib/utils/features";
	import FilterControl from "@/components/menus/filters/FilterControl.svelte";
	import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
	import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
	import { deleteAllFeaturesOfType } from "@/lib/map/featuresGen.svelte";
	import { updateAllMapObjects } from "@/lib/mapObjects/updateMapObject";
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
		attachedPermissions={Features.ROUTE}
		subCategories={[
			{
				title: m.plain_pokestops(),
				category: "pokestopPlain",
				requiredPermission: Features.POKESTOP,
				filterable: false
			},
			{
				title: m.pogo_quests(),
				category: "quest",
				requiredPermission: Features.QUEST,
				filterModal: "filtersetQuest"
			},
			{
				title: m.pogo_invasion(),
				category: "invasion",
				requiredPermission: Features.INVASION,
				filterModal: "filtersetInvasion"
			},
			{ title: m.lures(), category: "lure", requiredPermission: Features.LURE, filterable: false },
			{
				title: m.contests(),
				category: "contest",
				requiredPermission: Features.CONTEST,
				filterable: false
			},
			{
				title: m.kecleon(),
				category: "kecleon",
				requiredPermission: Features.KECLEON,
				filterable: false
			},
			{
				title: m.golden_pokestops(),
				category: "goldPokestop",
				requiredPermission: Features.GOLDEN_POKESTOP,
				filterable: false
			}
		]}
	>
		{#snippet attachedControls()}
			{#if hasFeatureAnywhere(getUserDetails().permissions, Features.ROUTE)}
				<div class="border-t border-border">
					<FilterControl
						title={m.routes()}
						majorCategory="route"
						mapObject={MapObjectType.ROUTE}
						filter={getUserSettings().filters.route}
						isFilterable={false}
						onEnabledChange={(_category, enabled) => {
							getUserSettings().filters.route.enabled = enabled;
							deleteAllFeaturesOfType(MapObjectType.ROUTE);
							updateUserSettings();
							updateAllMapObjects().then();
						}}
					/>
				</div>
			{/if}
		{/snippet}
	</FilterSection>

	<FilterSection
		requiredPermission={Features.GYM}
		title={mapObjectLabels[MapObjectType.GYM]()}
		category="gym"
		mapObject={MapObjectType.GYM}
		isFilterable={false}
		subCategories={[
			{
				title: m.plain_gyms(),
				category: "gymPlain",
				requiredPermission: Features.GYM,
				filterable: false
			},
			{
				title: m.raids(),
				category: "raid",
				requiredPermission: Features.RAID,
				filterModal: "filtersetRaid"
			}
		]}
	/>

	<FilterSection
		requiredPermission={Features.STATION}
		title={mapObjectLabels[MapObjectType.STATION]()}
		category={MapObjectType.STATION}
		mapObject={MapObjectType.STATION}
		isFilterable={false}
		subCategories={[
			{
				title: m.plain_stations(),
				category: "stationPlain",
				requiredPermission: Features.STATION,
				filterable: false
			},
			{
				title: m.max_battles(),
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
