<script lang="ts" generics="Data extends Record<string, any>">
	import PokemonSelect from "@/components/menus/filters/filterset/multiselect/PokemonSelect.svelte";
	import * as m from "@/lib/paraglide/messages";
	import SearchBar from "@/components/ui/input/SearchBar.svelte";
	import type { PokemonVisual } from "@/lib/types/mapObjectData/pokemon";
	import type { Pokemon } from "@/lib/features/filters/filtersets";
	import { slide } from "svelte/transition";

	type PokemonKey = {
		[K in keyof Data]: Data[K] extends Pokemon[] | undefined ? K : never;
	}[keyof Data];

	let {
		data,
		attribute,
		pokemonList
	}: {
		data: Data;
		attribute: PokemonKey & string;
		pokemonList: PokemonVisual[];
	} = $props();

	let query: string = $state("");

	function onselect(pokemon: PokemonVisual, isSelected: boolean) {
		if (!isSelected) {
			data[attribute] = data[attribute]?.filter(
				(p: { pokemon_id: number; form: number }) =>
					p.pokemon_id !== pokemon.pokemon_id || p.form !== pokemon.form
			);
		} else {
			if (!data[attribute]) data[attribute] = [] as any;
			data[attribute].push({
				pokemon_id: pokemon.pokemon_id,
				form: pokemon.form ?? 0
			});
		}

		if (data[attribute]?.length === 0) delete data[attribute];
	}
</script>

<SearchBar placeholder={m.search_placeholder_pokemon()} class="mb-2 mt-1" bind:query />

<div class="space-y-5 mt-2">
	{#if !query && data[attribute]}
		<div transition:slide={{ duration: 90 }}>
			<PokemonSelect
				pokemonList={data[attribute] ?? []}
				selected={data[attribute] ?? []}
				{onselect}
				title={m.pokemon_picker_selected()}
			/>
		</div>
	{/if}

	<PokemonSelect
		{pokemonList}
		selected={data[attribute] ?? []}
		{onselect}
		{query}
		title={m.pokemon_picker_available()}
	/>
</div>
