<script lang="ts">
	import PokemonSelect from "@/components/menus/filters/filterset/multiselect/PokemonSelect.svelte";
	import * as m from "@/lib/paraglide/messages";
	import SearchBar from "@/components/ui/input/SearchBar.svelte";
	import type { PokemonVisual } from "@/lib/types/mapObjectData/pokemon";
	import { slide } from "svelte/transition";

	type Boss = PokemonVisual & { level: number };

	let {
		bosses,
		selected,
		onselect,
		getLevelTitle
	}: {
		bosses: Boss[];
		selected: PokemonVisual[];
		onselect: (pokemon: PokemonVisual, isSelected: boolean) => void;
		getLevelTitle: (level: number) => string;
	} = $props();

	let query: string = $state("");

	const uniqueLevels = [...new Set(bosses.map((b) => b.level))].sort((a, b) => a - b);
</script>

<SearchBar placeholder={m.search_placeholder_pokemon()} class="mb-2 mt-1" bind:query />

<div class="space-y-5 mt-2">
	{#if !query && selected.length > 0}
		<div transition:slide={{ duration: 90 }}>
			<PokemonSelect
				pokemonList={selected}
				{selected}
				{onselect}
				title={m.pokemon_picker_selected()}
			/>
		</div>
	{/if}

	{#each uniqueLevels as level (level)}
		<PokemonSelect
			pokemonList={bosses.filter((b) => b.level === level)}
			{selected}
			{onselect}
			{query}
			title={getLevelTitle(level)}
		/>
	{/each}
</div>
