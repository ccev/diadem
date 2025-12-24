<script lang="ts">
	import SearchGroup from "@/components/ui/search/SearchGroup.svelte";
	import { flyTo } from "@/lib/map/utils";
	import SearchItem from "@/components/ui/search/SearchItem.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { closeModal } from "@/lib/ui/modal.svelte";
	import { searchExternal, SearchType } from "@/lib/services/search.svelte";
	import { Coords } from "@/lib/utils/coordinates";
	import { getMap } from "@/lib/map/map.svelte";
	import { addMapObjects, getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
	import { openPopup } from "@/lib/mapObjects/interact";
	import { fetchMapObjects } from "@/lib/mapObjects/updateMapObject";
	import { updateFeatures } from "@/lib/map/featuresGen.svelte";
	import { onMount } from "svelte";
	import { getBounds } from "@/lib/mapObjects/mapBounds";
	import type { PokestopData } from "@/lib/types/mapObjectData/pokestop.d.ts";
	import { makeMapObject } from "@/lib/mapObjects/makeMapObject";

	let {
		searchQuery
	}: {
		searchQuery: string
	} = $props()

	let pokestops: PokestopData[] = $state([])
	let isLoading: boolean = $state(false)

	onMount(() => {
		isLoading = true
		fetchMapObjects<PokestopData>("pokestop", getBounds()).then(r => {
			if (r) {
				pokestops = r.data.filter(p => p.name).sort((a, b) => a?.name?.localeCompare(b?.name ?? "") ?? 0)
				isLoading = false
			}
		})
	})

	function searchPokestop() {
		if (searchQuery.length > 0) {
			isLoading = true
			searchExternal<PokestopData>(SearchType.POKESTOP, searchQuery, Coords.infer(getMap()?.getCenter() ?? [])).then(r => {
				if (r) pokestops = r
				isLoading = false
			})
		}
	}
</script>

<SearchGroup
	title={m.pogo_pokestops()}
	items={pokestops}
	query={searchQuery}
	debounceCallback={searchPokestop}
	{isLoading}
>
	{#snippet item(pokestop: PokestopData)}
		<SearchItem
			onselect={() => {
				flyTo(Coords.infer(pokestop), 16.5)
				closeModal("search")
				openPopup(makeMapObject(pokestop, "pokestop"), true)
				addMapObjects([pokestop], "pokestop", 1)
				updateFeatures(getMapObjects());
			}}
			value={"" + pokestop.id}
			label={pokestop.name ?? m.unknown_pokestop()}
			image={pokestop.url}
		/>
	{/snippet}
</SearchGroup>