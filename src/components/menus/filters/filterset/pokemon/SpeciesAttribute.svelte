<script lang="ts">
	import type { FiltersetPokemon } from "@/lib/features/filters/filtersets";
	import { getSpawnablePokemon, getMasterPokemon } from "@/lib/services/masterfile";
	import PokemonSelect from "@/components/menus/filters/filterset/PokemonSelect.svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { mPokemon } from "@/lib/services/ingameLocale";

	let {
		data
	}: {
		data: FiltersetPokemon;
	} = $props();

	const allPokemon = getSpawnablePokemon();

	let searchQuery: string = $state("");
	type QuickFilter = "all" | "selected" | "legendary";
	let quickFilter: QuickFilter = $state("all");

	let filteredPokemon = $derived.by(() => {
		let list = allPokemon;

		if (quickFilter === "selected") {
			list = list.filter((p) =>
				(data.pokemon ?? []).some((s) => s.pokemon_id === p.pokemon_id && s.form === p.form)
			);
		} else if (quickFilter === "legendary") {
			list = list.filter((p) => getMasterPokemon(p.pokemon_id)?.legendary);
		}

		const query = searchQuery.trim().toLowerCase();
		if (query) {
			list = list.filter((p) => mPokemon(p).toLowerCase().includes(query));
		}

		return list;
	});
</script>

<input
	class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full h-10 rounded-md border px-3 py-2 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 mb-2"
	type="search"
	placeholder={m.search_placeholder()}
	value={searchQuery}
	oninput={(e) => (searchQuery = e.currentTarget.value)}
/>

<div class="flex gap-1 mb-2">
	<Button
		variant={quickFilter === "all" ? "secondary" : "outline"}
		size="sm"
		onclick={() => (quickFilter = "all")}
	>
		{m.any()}
	</Button>
	<Button
		variant={quickFilter === "selected" ? "secondary" : "outline"}
		size="sm"
		onclick={() => (quickFilter = "selected")}
	>
		{m.species_quick_filter_selected()}
	</Button>
	<Button
		variant={quickFilter === "legendary" ? "secondary" : "outline"}
		size="sm"
		onclick={() => (quickFilter = "legendary")}
	>
		{m.pokemon_class_1()}
	</Button>
</div>

<div class="overflow-y-auto flex flex-wrap -mx-4 px-4">
	<PokemonSelect
		pokemonList={filteredPokemon}
		selected={data?.pokemon ?? []}
		onselect={(pokemon, isSelected) => {
			if (!isSelected) {
				data.pokemon = data.pokemon?.filter(
					(p) => p.pokemon_id !== pokemon.pokemon_id || p.form !== pokemon.form
				);
			} else {
				if (!data.pokemon) data.pokemon = [];
				data.pokemon.push(pokemon);
			}

			if (data.pokemon?.length === 0) delete data.pokemon;
		}}
	/>
</div>
