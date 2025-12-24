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

	let addresses: AddressData[] = $state([])
	let isLoading: boolean = $state(false)

	function searchAddress() {
		if (searchQuery.length > 3) {
			isLoading = true
			geocode(searchQuery).then(a => {
				addresses = a
				isLoading = false
			})
		} else {
			addresses = []
		}
	}
</script>

<SearchGroup
	title={m.search_place_title()}
	items={addresses}
	query={searchQuery}
	debounceCallback={searchAddress}
	{isLoading}
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