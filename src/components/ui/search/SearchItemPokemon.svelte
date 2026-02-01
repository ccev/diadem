<script lang="ts">
	import { resize } from "@/lib/services/assets";
	import { getIconPokemon } from "@/lib/services/uicons.svelte";
	import SearchItem from "@/components/ui/search/SearchItem.svelte";
	import type { FuzzyResult } from "@nozbe/microfuzz";
	import { setActiveSearchPokemon } from "@/lib/features/activeSearch.svelte";
	import type { PokemonSearchEntry } from "@/lib/services/search.svelte";
	import { m } from "@/lib/paraglide/messages";

	let {
		result
	}: {
		result: FuzzyResult<PokemonSearchEntry>
	} = $props();
</script>

<SearchItem
	{result}
	identifier={m.pogo_pokemon()}
	onselect={() => {
		setActiveSearchPokemon(result.item.name, { pokemon_id: result.item.id, form: result.item.form })
	}}
	imageUrl={resize(getIconPokemon({ pokemon_id: result.item.id, form: result.item.form }), { width: 64 })}
/>