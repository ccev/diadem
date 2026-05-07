<script lang="ts">
	import * as m from "@/lib/paraglide/messages";
	import FilterSection from "@/components/menus/filters/FilterSection.svelte";
	import SignInButton from "@/components/ui/user/SignInButton.svelte";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import {
		POKESTOP_SUB_FEATURES,
		GYM_SUB_FEATURES,
		STATION_SUB_FEATURES
	} from "@/lib/permissions/subFeatures";

	// Derive sub-row props from the registry. An entry is UI-visible when
	// it has both a `title` and a `filterCategory`; server-only entries
	// (e.g. DEFENDER) are filtered out. Wrapped in $derived so locale
	// changes re-render titles.
	const pokestopSubs = $derived(
		POKESTOP_SUB_FEATURES.filter((e) => e.title && e.filterCategory).map((e) => ({
			title: e.title!(),
			category: e.filterCategory!,
			filterModal: e.filterModal,
			filterable: e.filterable ?? true,
			subPermission: e.feature
		}))
	);
	const gymSubs = $derived(
		GYM_SUB_FEATURES.filter((e) => e.title && e.filterCategory).map((e) => ({
			title: e.title!(),
			category: e.filterCategory!,
			filterModal: e.filterModal,
			filterable: e.filterable ?? true,
			subPermission: e.feature
		}))
	);
	const stationSubs = $derived(
		STATION_SUB_FEATURES.filter((e) => e.title && e.filterCategory).map((e) => ({
			title: e.title!(),
			category: e.filterCategory!,
			filterModal: e.filterModal,
			filterable: e.filterable ?? true,
			subPermission: e.feature
		}))
	);
</script>

<div
	class="space-y-2 mb-0.5 overflow-x-hidden"
	style="container-name: menu; container-type: inline-size"
>
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
		subCategories={pokestopSubs}
	/>

	<FilterSection
		requiredPermission={MapObjectType.GYM}
		title={m.pogo_gyms()}
		category="gym"
		mapObject={MapObjectType.GYM}
		isFilterable={false}
		subCategories={gymSubs}
	/>

	<FilterSection
		requiredPermission={MapObjectType.STATION}
		title={m.pogo_stations()}
		category={MapObjectType.STATION}
		mapObject={MapObjectType.STATION}
		isFilterable={false}
		subCategories={stationSubs}
	/>

	<FilterSection
		requiredPermission={MapObjectType.NEST}
		title={m.nests()}
		mapObject={MapObjectType.NEST}
		category="nest"
		isFilterable={false}
	/>

	<FilterSection
		requiredPermission={MapObjectType.TAPPABLE}
		title={m.tappables()}
		mapObject={MapObjectType.TAPPABLE}
		category="tappable"
		isFilterable={false}
	/>

	<!--	<FilterSection-->
	<!--		requiredPermission={MapObjectType.ROUTE}-->
	<!--		title={m.routes()}-->
	<!--		mapObject={MapObjectType.ROUTE}-->
	<!--		category="route"-->
	<!--		isFilterable={false}-->
	<!--	/>-->

	<FilterSection
		requiredPermission={MapObjectType.S2_CELL}
		title={m.s2_cells()}
		mapObject={MapObjectType.S2_CELL}
		category="s2cell"
		isFilterable={false}
	/>

	<FilterSection
		requiredPermission={MapObjectType.SPAWNPOINT}
		title={m.spawnpoints()}
		mapObject={MapObjectType.SPAWNPOINT}
		category="spawnpoint"
		isFilterable={false}
	/>
</div>
