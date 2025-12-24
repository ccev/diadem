<script lang="ts">
	import SearchGroup from "@/components/ui/search/SearchGroup.svelte";
	import { flyTo } from "@/lib/map/utils";
	import SearchItem from "@/components/ui/search/SearchItem.svelte";
	import { Debounced, watch } from "runed";
	import { type AddressData } from "@/lib/features/geocoding";
	import * as m from "@/lib/paraglide/messages";
	import { closeModal } from "@/lib/ui/modal.svelte";
	import type { GymData } from "@/lib/types/mapObjectData/gym.d.ts";
	import { searchExternal, SearchType } from "@/lib/services/search";
	import { Coords } from "@/lib/utils/coordinates";
	import { getMap } from "@/lib/map/map.svelte";
	import { addMapObjects, getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
	import { openPopup } from "@/lib/mapObjects/interact";
	import { updateAllMapObjects } from "@/lib/mapObjects/updateMapObject";
	import { updateFeatures } from "@/lib/map/featuresGen.svelte";

	let {
		searchQuery
	}: {
		searchQuery: string
	} = $props()

	const titlePrefix = " · "

	let gyms: GymData[] = $state([])
	let extraTitle: string = $state("")

	const debounced = new Debounced(() => searchQuery, 100)

	watch(
		() => debounced.current,
		() => {
			if (searchQuery.length > 3) {
				extraTitle = titlePrefix + m.search_address_loading()
				searchExternal<GymData>(SearchType.GYM, searchQuery, Coords.infer(getMap()?.getCenter() ?? [])).then(r => {
					if (r) gyms = r
					extraTitle = gyms.length > 0 ? "" : titlePrefix + m.search_address_no_place_found()
				})
			} else {
				extraTitle = searchQuery ? titlePrefix + m.search_address_no_place_found() : ""
				gyms = []
			}
		}
	)
</script>

<SearchGroup
	title="{m.pogo_gyms()}{extraTitle}"
	items={gyms}
>
	{#snippet item(gym: GymData)}
		<SearchItem
			onselect={() => {
				flyTo(Coords.infer(gym), 18)
				closeModal("search")
				addMapObjects([gym], "gym", 1)
				openPopup(gym)
				updateFeatures(getMapObjects());
			}}
			value={"" + gym.id}
			label={gym.name ?? m.unknown_gym()}
			image={gym.url}
		/>
	{/snippet}
</SearchGroup>