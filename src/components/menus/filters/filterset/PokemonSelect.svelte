<script lang="ts">
	import { mPokemon } from "@/lib/services/ingameLocale";
	import { resize } from "@/lib/services/assets";
	import { getIconPokemon } from "@/lib/services/uicons.svelte";
	import LongSelectItem from "@/components/menus/filters/LongSelectItem.svelte";
	import type { PokemonData, PokemonVisual } from "@/lib/types/mapObjectData/pokemon";
	import Switch from "@/components/ui/input/Switch.svelte";
	import { filterColors } from "@/lib/features/filters/colors";
	import {slide} from "svelte/transition";

	let {
		pokemonList,
		selected,
		onselect,
		title,
		getKey = (pokemon: PokemonVisual) => `${pokemon.pokemon_id}-${pokemon.form}`
	}: {
		pokemonList: PokemonVisual[];
		selected: PokemonVisual[];
		onselect: (pokemon: PokemonVisual, isSelected: boolean) => void;
		title: string;
		getKey?: (pokemon: PokemonVisual) => string;
	} = $props();

	let selectedValues = $derived(selected.map((p) => getKey(p)) ?? []);

	function comparePokemonVisual(a: PokemonVisual, b: PokemonVisual): number {
		return (
			(a.pokemon_id - b.pokemon_id) ||
			((a.form ?? 0) - (b.form ?? 0)) ||
			((a.temp_evolution_id ?? 0) - (b.temp_evolution_id ?? 0)) ||
			((a.alignment ?? 0) - (b.alignment ?? 0)) ||
			((a.bread_mode ?? 0) - (b.bread_mode ?? 0)) ||
			((a.gender ?? 0) - (b.gender ?? 0)) ||
			((a.costume ?? 0) - (b.costume ?? 0))
		);
	}

	let sortedList = $derived([...pokemonList].sort(comparePokemonVisual));

	const color = filterColors.yellow
</script>

<h2 class="font-semibold mb-2">
	{title}
</h2>

<!--<div class="flex justify-between items-center mb-2">-->
<!--	<h2 class="font-semibold">-->
<!--		{title}-->
<!--	</h2>-->
<!--	<div class="flex items-center gap-2">-->
<!--		<Switch checked={true} />-->
<!--		<span class="">-->
<!--			Show available-->
<!--		</span>-->
<!--	</div>-->
<!--</div>-->

<div
	class="grid gap-1 text-xs font-semibold"
	style:grid-template-columns="repeat(auto-fill, minmax(5rem, 1fr))"
	style:--color-attr-chip-border="var({color.border})"
	style:--color-attr-chip-bg="var({color.bg})"
	style:--color-attr-chip-text="var({color.text})"
	style:--color-attr-chip-dark-border="var({color.dark.border})"
	style:--color-attr-chip-dark-bg="var({color.dark.bg})"
	style:--color-attr-chip-dark-text="var({color.dark.text})"
	transition:slide={{ duration: 90 }}
>
	{#each sortedList as pokemon (getKey(pokemon))}
		{@const isSelected = selectedValues.includes(getKey(pokemon))}
		<button
			class="cursor-pointer hover:bg-accent rounded-sm border border-border flex flex-col items-center pt-2 pb-1 px-1 gap-1"
			class:dark:bg-(--color-attr-chip-dark-bg)={isSelected}
			class:dark:border-(--color-attr-chip-dark-border)={isSelected}
			class:dark:text-(--color-attr-chip-dark-text)={isSelected}
			class:bg-(--color-attr-chip-bg)={isSelected}
			class:border-(--color-attr-chip-border)={isSelected}
			class:text-(--color-attr-chip-text)={isSelected}
			onclick={() => {
				onselect(pokemon, !isSelected);
			}}
		>
			<img
				class="size-8"
				alt={mPokemon(pokemon)}
				src={resize(getIconPokemon(pokemon), { width: 64 })}
				loading="lazy"
			/>
			<div class="grow text-center align-middle flex items-center px-1">
				<span class="h-fit">
					{mPokemon(pokemon)}
				</span>
			</div>
		</button>
	{/each}
</div>

<!--{#each pokemonList as pokemon (getKey(pokemon))}-->
<!--	<LongSelectItem-->
<!--		isSelected={selectedValues.includes(getKey(pokemon))}-->
<!--		onselect={(isSelected) => {-->
<!--			onselect(pokemon, isSelected);-->
<!--		}}-->
<!--	>-->
<!--		<img-->
<!--			class:size-10={!isCompact}-->
<!--			alt={mPokemon(pokemon)}-->
<!--			src={resize(getIconPokemon(pokemon), { width: 64 })}-->
<!--			loading="lazy"-->
<!--		/>-->
<!--		<span>-->
<!--			{mPokemon(pokemon)}-->
<!--		</span>-->
<!--	</LongSelectItem>-->
<!--{/each}-->
