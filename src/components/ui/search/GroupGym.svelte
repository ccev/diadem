<script lang="ts">
	import SearchGroup from "@/components/ui/search/SearchGroup.svelte";
	import { flyTo } from "@/lib/map/utils";
	import SearchItem from "@/components/ui/search/SearchItem.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { closeModal } from "@/lib/ui/modal.svelte";
	import type { GymData } from "@/lib/types/mapObjectData/gym.d.ts";
	import { searchExternal, SearchType } from "@/lib/services/search.svelte";
	import { Coords } from "@/lib/utils/coordinates";
	import { getMap } from "@/lib/map/map.svelte";
	import { addMapObjects, getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
	import { openPopup } from "@/lib/mapObjects/interact";
	import { fetchMapObjects } from "@/lib/mapObjects/updateMapObject";
	import { updateFeatures } from "@/lib/map/featuresGen.svelte";
	import { onMount } from "svelte";
	import { getBounds } from "@/lib/mapObjects/mapBounds";
	import { makeMapObject } from "@/lib/mapObjects/makeMapObject";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

	let {
		searchQuery
	}: {
		searchQuery: string
	} = $props()

	let gyms: GymData[] = $state([])
	let isLoading: boolean = $state(false)

	onMount(() => {
		isLoading = true
		fetchMapObjects<GymData>(MapObjectType.GYM, getBounds()).then(r => {
			if (r) {
				gyms = r.data.filter(g => g.name).sort((a, b) => a?.name?.localeCompare(b?.name ?? "") ?? 0)
				isLoading = false
			}
		})
	})

	function searchGym() {
		if (searchQuery.length > 0) {
			isLoading = true
			searchExternal<GymData>(SearchType.GYM, searchQuery, Coords.infer(getMap()?.getCenter() ?? [])).then(r => {
				if (r) gyms = r
				isLoading = false
			})
		}
	}
</script>

<SearchGroup
	title={m.pogo_gyms()}
	items={gyms}
	query={searchQuery}
	debounceCallback={searchGym}
	{isLoading}
>
	{#snippet item(gym: GymData)}
		<SearchItem
			onselect={() => {
				flyTo(Coords.infer(gym), 16.5)
				closeModal("search")
				openPopup(makeMapObject(gym, MapObjectType.GYM), true)
				addMapObjects([gym], MapObjectType.GYM, 1)
				updateFeatures(getMapObjects());
			}}
			value={"" + gym.id}
			label={gym.name ?? m.unknown_gym()}
			image={gym.url}
		/>
	{/snippet}
</SearchGroup>