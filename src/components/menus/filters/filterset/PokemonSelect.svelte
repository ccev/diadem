<script lang="ts" generics="P extends Partial<PokemonData>">
	import { mPokemon } from "@/lib/services/ingameLocale";
	import { resize } from "@/lib/services/assets";
	import { getIconPokemon } from "@/lib/services/uicons.svelte";
	import LongSelectItem from "@/components/menus/filters/LongSelectItem.svelte";
	import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";

	let {
		pokemonList,
		selected,
		onselect,
		getKey = (pokemon: P) => `${pokemon.pokemon_id}-${pokemon.form}`
	}: {
		pokemonList: P[]
		selected: P[]
		onselect: (pokemon: P, isSelected: boolean) => void,
		getKey?: (pokemon: P) => string
	} = $props();

	// TODO: style pokemon select better
	const isCompact = false;

	let selectedValues = $derived(selected.map(p => getKey(p)) ?? []);
</script>

{#each pokemonList as pokemon (getKey(pokemon))}
	<LongSelectItem
		isSelected={selectedValues.includes(getKey(pokemon))}
		onselect={(isSelected) => {
			onselect(pokemon, isSelected)
		}}
	>
		<img
			class:size-10={!isCompact}
			alt={mPokemon(pokemon)}
			src={resize(getIconPokemon(pokemon), { width: 64 })}
			loading="lazy"
		>
		<span>
			{mPokemon(pokemon)}
		</span>
	</LongSelectItem>
{/each}