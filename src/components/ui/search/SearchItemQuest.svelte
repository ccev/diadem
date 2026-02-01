<script lang="ts">
	import { resize } from "@/lib/services/assets";
	import { getIconPokemon, getIconReward } from "@/lib/services/uicons.svelte";
	import SearchItem from "@/components/ui/search/SearchItem.svelte";
	import type { FuzzyResult } from "@nozbe/microfuzz";
	import { setActiveSearchPokemon, setActiveSearchQuest } from "@/lib/features/activeSearch.svelte";
	import type { PokemonSearchEntry, QuestSearchEntry } from "@/lib/services/search.svelte";
	import { m } from "@/lib/paraglide/messages";

	let {
		result
	}: {
		result: FuzzyResult<QuestSearchEntry>
	} = $props();
</script>

<SearchItem
	{result}
	identifier={m.pogo_quests()}
	onselect={() => {
		setActiveSearchQuest(result.item.name, result.item.reward)
	}}
	imageUrl={resize(getIconReward(result.item.reward.type, result.item.reward.info), { width: 64 })}
/>