<script lang="ts">
	import type { FiltersetPokemon } from "@/lib/features/filters/filtersets";
	import { getAllPokemon, getMasterPokemon } from "@/lib/services/masterfile";
	import PokemonSelect from "@/components/menus/filters/filterset/PokemonSelect.svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { mPokemon } from "@/lib/services/ingameLocale";
	import { getSpawnablePokemon } from "@/lib/features/masterStats.svelte";
	import { resize } from "@/lib/services/assets";
	import { getIconPokemon } from "@/lib/services/uicons.svelte";
	import Switch from "@/components/ui/input/Switch.svelte";
	import { Search, X } from "lucide-svelte";
	import Input from "@/components/ui/input/Input.svelte";
	import SearchBar from "@/components/ui/input/SearchBar.svelte";

	let {
		data
	}: {
		data: FiltersetPokemon;
	} = $props();

	const allPokemon = getSpawnablePokemon();

	let searchQuery: string = $state("");

	let filteredPokemon = $derived.by(() => {
		let list = allPokemon;

		const query = searchQuery.trim().toLowerCase();
		if (query) {
			list = list.filter((p) => mPokemon(p).toLowerCase().includes(query));
		}

		return list;
	});

	function onselect(pokemon: PokemonVisual, isSelected: boolean) {
		if (!isSelected) {
			data.pokemon = data.pokemon?.filter(
				(p) => p.pokemon_id !== pokemon.pokemon_id || p.form !== pokemon.form
			);
		} else {
			if (!data.pokemon) data.pokemon = [];
			data.pokemon.push({
				pokemon_id: pokemon.pokemon_id,
				form: pokemon.form ?? 0
			});
		}

		if (data.pokemon?.length === 0) delete data.pokemon;
	}
</script>

<SearchBar placeholder={m.search_placeholder_pokemon()} class="mb-2 mt-1" bind:query={searchQuery} />

<div class="space-y-5 mt-2">
	{#if !searchQuery && data.pokemon}
		<PokemonSelect
			pokemonList={data.pokemon ?? []}
			selected={data?.pokemon ?? []}
			{onselect}
			title={m.pokemon_picker_selected()}
		/>
	{/if}

	<PokemonSelect
		pokemonList={filteredPokemon}
		selected={data?.pokemon ?? []}
		{onselect}
		title={m.pokemon_picker_available()}
	/>
</div>

