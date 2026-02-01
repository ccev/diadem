<script lang="ts">
	import type { FuzzyResult } from "@nozbe/microfuzz";
	import { type AnySearchEntry, SearchableType } from "@/lib/services/search.svelte";
	import SearchItemPokemon from "@/components/ui/search/SearchItemPokemon.svelte";
	import SearchItemArea from "@/components/ui/search/SearchItemArea.svelte";
	import SearchItemQuest from "@/components/ui/search/SearchItemQuest.svelte";

	let {
		results
	}: {
		results: FuzzyResult<AnySearchEntry>[]
	} = $props()
</script>

{#each results as result}
	{#if result.item.type === SearchableType.POKEMON}
		<SearchItemPokemon {result} />
	{:else if result.item.type === SearchableType.AREA}
		<SearchItemArea {result} />
	{:else if result.item.type === SearchableType.QUEST}
		<SearchItemQuest {result} />
	{/if}
{/each}