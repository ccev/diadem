<script lang="ts">
	import { mPokemon } from "@/lib/services/ingameLocale";
	import { resize } from "@/lib/services/assets";
	import { getIconPokemon } from "@/lib/services/uicons.svelte.js";
	import type { PokemonVisual } from "@/lib/types/mapObjectData/pokemon";
	import { m } from "@/lib/paraglide/messages";
	import { tick } from "svelte";
	import { slide } from "svelte/transition";
	import type { HighlightRanges } from "@nozbe/microfuzz";
	import { createFuzzySearch, highlightSearchMatches } from "@/lib/services/search.svelte.js";
	import MultiSelect from "@/components/menus/filters/filterset/multiselect/MultiSelect.svelte";
	import MultiSelectItem from "@/components/menus/filters/filterset/multiselect/MultiSelectItem.svelte";
	import Button from "@/components/ui/input/Button.svelte";

	let {
		pokemonList,
		selected,
		onselect,
		title,
		query = $bindable(undefined)
	}: {
		pokemonList: PokemonVisual[];
		selected: PokemonVisual[];
		onselect: (pokemon: PokemonVisual, isSelected: boolean) => void;
		title: string;
		query?: string;
	} = $props();

	const searchable = $derived(query !== undefined);
	const searcher = $derived(
		searchable
			? createFuzzySearch(pokemonList, { getText: (p: PokemonVisual) => [mPokemon(p)] })
			: undefined
	);
	const selectedValues = $derived(new Set(selected.map(getKey)));
	const PAGE_SIZE = 60;
	// Reset on search changes, without collapsing the list when a selection changes.
	let visibleCount = $derived.by(() => {
		query;
		return PAGE_SIZE;
	});

	function getKey(p: PokemonVisual) {
		return `${p.pokemon_id}-${p.form}-${p.temp_evolution_id}-${p.alignment}-${p.bread_mode}-${p.gender}-${p.costume}`;
	}

	function comparePokemonVisual(a: PokemonVisual, b: PokemonVisual): number {
		return (
			a.pokemon_id - b.pokemon_id ||
			(a.form ?? 0) - (b.form ?? 0) ||
			(a.temp_evolution_id ?? 0) - (b.temp_evolution_id ?? 0) ||
			(a.costume ?? 0) - (b.costume ?? 0)
		);
	}

	let fuzzyResults = $derived.by(() => {
		const q = query?.trim();
		if (!q) return null;

		return searcher?.(q) ?? null;
	});

	let highlights = $derived.by(() => {
		if (!fuzzyResults) return undefined;

		return new Map<string, HighlightRanges>(
			fuzzyResults.flatMap(({ item, matches }) =>
				matches[0] ? [[getKey(item), matches[0]] as const] : []
			)
		);
	});

	let sortedList = $derived(
		[...(fuzzyResults ? fuzzyResults.map((r) => r.item) : pokemonList)].sort(comparePokemonVisual)
	);
</script>

{#if sortedList.length > 0}
	<div transition:slide={{ duration: 90 }}>
		<h2 class="font-semibold mb-2 ml-0.5">
			{title}
		</h2>

		<MultiSelect>
			{#each sortedList.slice(0, visibleCount) as pokemon (getKey(pokemon))}
				{@const key = getKey(pokemon)}
				{@const name = mPokemon(pokemon)}
				{@const isSelected = selectedValues.has(key)}

				<MultiSelectItem
					{isSelected}
					onclick={(value) => {
						onselect(pokemon, value);
					}}
				>
					<img
						class="size-8"
						alt={name}
						src={resize(getIconPokemon(pokemon), { width: 64 })}
						loading="lazy"
					/>
					<div class="grow text-center align-middle flex items-center px-1">
						<span class="h-fit" {@attach highlightSearchMatches(highlights?.get(key))}>
							{name}
						</span>
					</div>
				</MultiSelectItem>
			{/each}
		</MultiSelect>
		{#if visibleCount < sortedList.length}
			<Button
				type="button"
				variant="outline"
				size="sm"
				class="mt-2 w-full"
				onclick={async (event) => {
					const grid = event.currentTarget.previousElementSibling;
					const firstNewIndex = visibleCount;
					visibleCount += PAGE_SIZE;
					await tick();
					grid?.querySelectorAll("button")[firstNewIndex]?.focus();
				}}
				{@attach (button: HTMLElement) => {
					const observer = new IntersectionObserver((entries) => {
						if (
							entries.some((entry) => entry.isIntersecting) &&
							document.activeElement !== button
						) {
							visibleCount += PAGE_SIZE;
						}
					});
					observer.observe(button);
					return () => observer.disconnect();
				}}
			>
				{m.pokemon_picker_show_more()}
			</Button>
		{/if}
	</div>
{/if}
