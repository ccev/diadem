<script lang="ts">
	import SearchGroup from '@/components/ui/search/SearchGroup.svelte';
	import { flyTo } from '@/lib/map/utils';
	import SearchItem from '@/components/ui/search/SearchItem.svelte';
	import { watch } from 'runed';
	import { type AddressData, geocode } from '@/lib/geocoding';
	import * as m from '@/lib/paraglide/messages';

	let {
		searchQuery
	}: {
		searchQuery: string
	} = $props()

	const titlePrefix = " · "

	let addresses: AddressData[] = $state([])
	let extraTitle: string = $state("")

	watch(
		() => searchQuery,
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


<SearchGroup title="{m.search_place_title()}{extraTitle}">
	{#each addresses as address (address.id)}
		<SearchItem
			onselect={() => flyTo(address.center, 14)}
			value={"" + address.id}
			label={address.name}
			iconName={"MapPin"}
		/>
	{/each}
</SearchGroup>