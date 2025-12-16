<script lang="ts">
	import { mPokemon } from "@/lib/services/ingameLocale";
	import { resize } from "@/lib/services/assets";
	import { getIconPokemon } from "@/lib/services/uicons.svelte";

	type Pokemon = { pokemon_id: number; form: number }

	let {
		pokemonList,
		selected,
		onselect
	}: {
		pokemonList: Pokemon[]
		selected: Pokemon[]
		onselect: (pokemon: Pokemon, isSelected: boolean) => void
	} = $props();

	// TODO: style pokemon select better
	const isCompact = false;

	function pokemonValue(pokemon: Pokemon) {
		return `${pokemon.pokemon_id}-${pokemon.form}`;
	}

	let selectedValues = $derived(selected.map(p => pokemonValue(p)) ?? []);
</script>

{#each pokemonList as pokemon (`${pokemon.pokemon_id}-${pokemon.form}`)}
	{@const isSelected = selectedValues.includes(pokemonValue(pokemon))}

	<button
		class="p-1 flex flex-col items-center text-sm cursor-pointer hover:bg-accent"
		class:w-20={!isCompact}
		class:h-22={!isCompact}
		class:py-1={!isCompact}
		class:rounded-sm={!isCompact}
		class:size-10={isCompact}
		data-pokemon-id={pokemon.pokemon_id}
		data-form-id={pokemon.form}
		class:bg-sky-100={isSelected}
		class:dark:bg-indigo-950={isSelected}
		onclick={() => onselect(pokemon, isSelected)}
	>
		<img
			class:size-10={!isCompact}
			alt={mPokemon(pokemon)}
			src={resize(getIconPokemon(pokemon), { width: 64 })}
			loading="lazy"
		>
		{#if !isCompact}
			<span>
				{mPokemon(pokemon)}
			</span>
		{/if}

	</button>
{/each}