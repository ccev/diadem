<script lang="ts">
	import { mPokemon } from "@/lib/services/ingameLocale";
	import { resize } from "@/lib/services/assets";
	import { getIconPokemon } from "@/lib/services/uicons.svelte";
	import type { PokemonVisual } from "@/lib/types/mapObjectData/pokemon";
	import { filterColors } from "@/lib/features/filters/colors";
	import { slide } from "svelte/transition";
	import type { HighlightRanges } from "@nozbe/microfuzz";
	import { createFuzzySearch, highlightSearchMatches } from "@/lib/services/search.svelte";

	let {
		pokemonList,
		selected,
		onselect,
		title,
		query = $bindable(undefined),
		getKey = (p: PokemonVisual) =>
			`${p.pokemon_id}-${p.form}-${p.temp_evolution_id}-${p.alignment}-${p.bread_mode}-${p.gender}-${p.costume}`
	}: {
		pokemonList: PokemonVisual[];
		selected: PokemonVisual[];
		onselect: (pokemon: PokemonVisual, isSelected: boolean) => void;
		title: string;
		query?: string;
		getKey?: (pokemon: PokemonVisual) => string;
	} = $props();

	const color = filterColors.yellow;
	const searcher = $derived(query !== undefined ? createFuzzySearch(pokemonList, { getText: (p: PokemonVisual) => [mPokemon(p)] }) : undefined);
	let selectedValues = $derived(selected.map((p) => getKey(p)) ?? []);

	function comparePokemonVisual(a: PokemonVisual, b: PokemonVisual): number {
		return (
			(a.pokemon_id - b.pokemon_id) ||
			((a.form ?? 0) - (b.form ?? 0)) ||
			((a.temp_evolution_id ?? 0) - (b.temp_evolution_id ?? 0)) ||
			((a.costume ?? 0) - (b.costume ?? 0))
		);
	}

	let fuzzyResults = $derived.by(() => {
		const q = query?.trim();
		if (!q) return null;

		return searcher?.(q) ?? null;
	});

	let highlights = $derived.by(() => {
		if (!fuzzyResults) return undefined;

		const map = new Map<string, HighlightRanges>();
		for (const r of fuzzyResults) {
			if (r.matches[0]) {
				map.set(getKey(r.item), r.matches[0]);
			}
		}
		return map;
	});

	let sortedList = $derived([...(fuzzyResults ? fuzzyResults.map((r) => r.item) : pokemonList)].sort(comparePokemonVisual));
</script>

<h2 class="font-semibold mb-2 ml-0.5">
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
				<span class="h-fit" {@attach highlightSearchMatches(highlights?.get(getKey(pokemon)))}>
					{mPokemon(pokemon)}
				</span>
			</div>
		</button>
	{/each}
</div>
