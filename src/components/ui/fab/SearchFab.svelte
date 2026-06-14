<script lang="ts">
	import { isAnyModalOpen } from "@/lib/ui/modal.svelte.js";
	import Search from "@/components/ui/search/Search.svelte";
	import BaseFab from "@/components/ui/fab/BaseFab.svelte";
	import { Search as SearchIcon } from "lucide-svelte";
	import { hasLoadedFeature, LoadedFeature } from "@/lib/services/initialLoad.svelte.js";
	import { isSupportedFeature } from "@/lib/services/supportedFeatures";
	import { isSearchViewActive } from "@/lib/features/activeSearch.svelte.js";
	import {
		type AnySearchEntry,
		initSearch,
		openSearchModal,
		SearchableType,
		type SearchOptions
	} from "@/lib/services/search.svelte";
	import type maplibre from "maplibre-gl";
	import { onShortcutSearch } from "@/lib/utils/keyboard";
	import { onDestroy } from "svelte";
	import MainSearchResults from "@/components/ui/search/MainSearchResults.svelte";
	import CoverageSearchResults from "@/components/ui/search/CoverageSearchResults.svelte";
	import WayfarerSearchResults from "@/components/ui/search/WayfarerSearchResults.svelte";
	import type { FuzzyResult } from "@nozbe/microfuzz";
	import * as m from "@/lib/paraglide/messages";

	let {
		searchMode = "main",
		map = undefined as maplibre.Map | undefined
	}: {
		searchMode?: "main" | "coverage" | "wayfarer";
		map?: maplibre.Map | undefined;
	} = $props();

	let searchOptions: SearchOptions = $derived.by(() => {
		if (searchMode === "coverage") {
			return {
				types: [SearchableType.AREA, SearchableType.ADDRESS, SearchableType.COORDINATES],
				showRecents: false,
				resultSnippet: coverageSearchResults,
				textSearchHint: m.search_hint_coverage(),
				textNoResults: m.search_no_results_generic(),
			};
		} else if (searchMode === "wayfarer") {
			return {
				types: [
					SearchableType.AREA,
					SearchableType.ADDRESS,
					SearchableType.GYM,
					SearchableType.POKESTOP
				],
				showRecents: false,
				resultSnippet: wayfarerSearchResults,
				textSearchHint: m.search_hint_wayfarer(),
				textNoResults: m.search_no_results_generic(),
			};
		} else {
			return {
				showRecents: true,
				resultSnippet: mainSearchResults,
			};
		}
	});

	let hasSearchData = $derived.by(() => {
		if (searchMode === "coverage") {
			return (
				hasLoadedFeature(LoadedFeature.SUPPORTED_FEATURES) &&
				(!isSupportedFeature("koji") || hasLoadedFeature(LoadedFeature.KOJI))
			);
		} else {
			return (
				hasLoadedFeature(
					LoadedFeature.SUPPORTED_FEATURES,
					LoadedFeature.REMOTE_LOCALE,
					LoadedFeature.ICON_SETS,
					LoadedFeature.MASTER_FILE,
					LoadedFeature.MASTER_STATS,
					LoadedFeature.USER_DETAILS
				) &&
				(!isSupportedFeature("koji") || hasLoadedFeature(LoadedFeature.KOJI))
			);
		}
	});

	let isSearchAllowed = $derived(!isSearchViewActive() && hasSearchData);
	let searchInitialized: boolean = $state(false);

	$effect(() => {
		if (isSearchAllowed) {
			initSearch(searchOptions);
			searchInitialized = true;
		}
	});

	const cleanupSearchShortcut = onShortcutSearch(() => {
		if (isSearchAllowed && !isAnyModalOpen()) {
			openSearchModal(searchOptions);
		}
	});
	onDestroy(cleanupSearchShortcut);
</script>

{#snippet mainSearchResults(results: FuzzyResult<AnySearchEntry>[])}
	<MainSearchResults {results} />
{/snippet}

{#snippet coverageSearchResults(results: FuzzyResult<AnySearchEntry>[])}
	<CoverageSearchResults {results} />
{/snippet}

{#snippet wayfarerSearchResults(results: FuzzyResult<AnySearchEntry>[])}
	<WayfarerSearchResults {results} {map} />
{/snippet}

{#if searchInitialized}
	<Search {searchOptions} />
{/if}

{#if isSearchAllowed}
	<BaseFab onclick={() => openSearchModal(searchOptions, map)}>
		<SearchIcon size="24" />
	</BaseFab>
{/if}
