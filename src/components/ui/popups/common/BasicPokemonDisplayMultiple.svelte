<script lang="ts">
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import { resize } from "$lib/services/assets";
	import { mPokemon } from "$lib/services/ingameLocale";
	import { getIconPokemon } from "$lib/services/uicons.svelte";

	type DisplayPokemon = {
		pokemon_id?: number | null;
		temp_evolution_id?: number | null;
		form?: number | null;
		costume?: number | null;
		gender?: number | null;
		alignment?: number | null;
		bread_mode?: number | null;
		shiny?: number | boolean | null;
	};

	let {
		pokemon,
		class: class_ = ""
	}: {
		pokemon: DisplayPokemon[];
		class?: string;
	} = $props();

	function getPokemonKey(pokemon: DisplayPokemon, index: number) {
		return [
			pokemon.pokemon_id,
			pokemon.temp_evolution_id,
			pokemon.form,
			pokemon.costume,
			pokemon.gender,
			pokemon.alignment,
			pokemon.bread_mode,
			pokemon.shiny,
			index
		].join("-");
	}
</script>

<div class="-mx-4 mt-2 {class_}">
	<div class="mt-2 flex w-full gap-3 overflow-x-auto px-4 *:shrink-0">
		{#each pokemon as pokemonEntry, index (getPokemonKey(pokemonEntry, index))}
			<div class="rounded-md bg-accent-highlight p-4">
				<div class="size-10">
					<ImagePopup
						class="size-10"
						src={resize(getIconPokemon(pokemonEntry), { width: 64 })}
						alt={mPokemon(pokemonEntry)}
					/>
				</div>
			</div>
		{/each}
	</div>
</div>
