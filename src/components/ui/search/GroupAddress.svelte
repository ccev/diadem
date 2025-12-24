<script lang="ts">
	import { Command } from 'bits-ui';
	import SearchGroup from '@/components/ui/search/SearchGroup.svelte';
	import { flyTo } from '@/lib/map/utils';
	import SearchItem from '@/components/ui/search/SearchItem.svelte';
	import { Debounced, watch } from "runed";
	import { type AddressData, geocode } from '@/lib/features/geocoding';
	import * as m from '@/lib/paraglide/messages';
	import { closeModal } from '@/lib/ui/modal.svelte';
	import { Coords } from "@/lib/utils/coordinates";

	let {
		searchQuery
	}: {
		searchQuery: string
	} = $props()

	const titlePrefix = " · "

	let addresses: AddressData[] = $state([])
	let extraTitle: string = $state("")

	const debounced = new Debounced(() => searchQuery, 100)

	watch(
		() => debounced.current,
		() => {
			if (searchQuery.length > 3) {
				extraTitle = titlePrefix + m.search_address_loading()
				geocode(searchQuery).then(a => {
					addresses = a
					extraTitle = addresses.length > 0 ? "" : titlePrefix + m.search_address_no_place_found()
				})
			} else {
				extraTitle = searchQuery ? titlePrefix + m.search_address_no_place_found() : ""
				addresses = []
			}
		}
	)


</script>

<SearchGroup
	title="{m.search_place_title()}{extraTitle}"
	items={addresses}
>
	{#snippet item(address: AddressData)}
		<SearchItem
			onselect={() => {
				flyTo(Coords.infer(address.center), 14)
				closeModal("search")
			}}
			value={"" + address.id}
			label={address.name}
			iconName={"MapPin"}
		/>
	{/snippet}
</SearchGroup>