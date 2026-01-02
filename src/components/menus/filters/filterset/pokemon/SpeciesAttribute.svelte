<script lang="ts">
	import type { FiltersetPokemon } from "@/lib/features/filters/filtersets";
	import { getSpawnablePokemon } from "@/lib/services/masterfile";
	import PokemonSelect from "@/components/menus/filters/filterset/PokemonSelect.svelte";

	let {
		data
	}: {
		data: FiltersetPokemon
	} = $props();
</script>

<div class="overflow-y-auto h-119 flex flex-wrap -mx-4 px-4">
	<PokemonSelect
		pokemonList={getSpawnablePokemon()}
		selected={data?.pokemon ?? []}
		onselect={(pokemon, isSelected) => {
			if (!isSelected) {
				data.pokemon = data.pokemon?.filter(p => p.pokemon_id !== pokemon.pokemon_id || p.form !== pokemon.form)
			} else {
				if (!data.pokemon) data.pokemon = []
				data.pokemon.push(pokemon)
			}

			if (data.pokemon?.length === 0) delete data.pokemon
		}}
	/>
</div>
