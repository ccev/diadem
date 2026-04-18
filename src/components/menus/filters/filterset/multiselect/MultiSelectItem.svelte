<script lang="ts">
	import { mPokemon } from "@/lib/services/ingameLocale";
	import { resize } from "@/lib/services/assets";
	import { getIconPokemon } from "@/lib/services/uicons.svelte.js";
	import type { PokemonVisual } from "@/lib/types/mapObjectData/pokemon";
	import { filterColors } from "@/lib/features/filters/colors";
	import { slide } from "svelte/transition";
	import type { HighlightRanges } from "@nozbe/microfuzz";
	import { createFuzzySearch, highlightSearchMatches } from "@/lib/services/search.svelte.js";
	import type { Snippet } from "svelte";

	let {
		children,
		isSelected = $bindable(),
		onclick = () => {}
	}: {
		children: Snippet;
		isSelected: boolean;
		onclick?: (isSelected: boolean) => void;
	} = $props();
</script>

<button
	class="cursor-pointer hover:bg-accent rounded-sm border border-border flex flex-col items-center pt-2 pb-1 px-1 gap-1"
	class:dark:bg-(--color-attr-chip-dark-bg)={isSelected}
	class:dark:border-(--color-attr-chip-dark-border)={isSelected}
	class:dark:text-(--color-attr-chip-dark-text)={isSelected}
	class:bg-(--color-attr-chip-bg)={isSelected}
	class:border-(--color-attr-chip-border)={isSelected}
	class:text-(--color-attr-chip-text)={isSelected}
	onclick={() => {
		isSelected = !isSelected;
		onclick(isSelected);
	}}
>
	{@render children()}
</button>
