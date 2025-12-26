<script lang="ts">
	import SearchGroup from "@/components/ui/search/SearchGroup.svelte";
	import SearchItem from "@/components/ui/search/SearchItem.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { closeModal } from "@/lib/ui/modal.svelte";
	import { searchExternal, searchPokemon, SearchType } from "@/lib/services/search.svelte";
	import { Coords } from "@/lib/utils/coordinates";
	import { getMap } from "@/lib/map/map.svelte";
	import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
	import { onMount } from "svelte";
	import type { PokemonData } from "@/lib/types/mapObjectData/pokemon.d.ts";
	import { mPokemon } from "@/lib/services/ingameLocale";
	import { resize } from "@/lib/services/assets";
	import { getIconPokemon } from "@/lib/services/uicons.svelte";
	import Countdown from "@/components/utils/Countdown.svelte";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

	let {
		searchQuery
	}: {
		searchQuery: string
	} = $props()

	let pokemon: PokemonData[] = $state([])
	let isLoading: boolean = $state(false)

	onMount(() => {
		const thisPokemon: PokemonData[] = []
		for (const obj of Object.values(getMapObjects())) {
			if (obj.type === MapObjectType.POKEMON) thisPokemon.push(obj)
		}
		pokemon = thisPokemon.sort((a, b) => mPokemon(a).localeCompare(mPokemon(b)))
	})

	function search() {
		if (searchQuery.length > 0) {
			isLoading = true
			const pokemonNames = searchPokemon(searchQuery)

			isLoading = true
			searchExternal<PokemonData>(SearchType.POKEMON, searchQuery, Coords.infer(getMap()?.getCenter() ?? [])).then(r => {
				if (r) pokemon = r
				isLoading = false
			})
		}
	}
</script>

<SearchGroup
	title={m.pogo_pokemon()}
	items={pokemon}
	query={searchQuery}
	debounceCallback={search}
	{isLoading}
>
	{#snippet item(pokemon: PokemonData)}
		<SearchItem
			onselect={() => {
				// flyTo(Coords.infer(pokemon), 16.5)
				closeModal("search")
				// openPopup(makeMapObject(pokemon, "gym"), true)
				// addMapObjects([pokemon], "gym", 1)
				// updateFeatures(getMapObjects());
			}}
			value={"" + pokemon.id}
			label={mPokemon(pokemon)}
			image={resize(getIconPokemon(pokemon), { width: 64 })}
		>
			{#snippet labelSnippet()}
				<span>
					{mPokemon(pokemon)}
				</span>
				{#if pokemon.iv}
					<span class="text-emerald-300">
						{pokemon.iv.toFixed(1)}%
					</span>
				{/if}
				<span class="text-muted-foreground">
					(<Countdown expireTime={pokemon.expire_timestamp} />)
				</span>
			{/snippet}
		</SearchItem>
	{/snippet}
</SearchGroup>