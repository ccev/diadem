<script lang="ts">
	import { type PokemonSearchEntry } from "@/lib/services/ingameLocale";
	import { resize } from "@/lib/services/assets";
	import { getIconPokemon } from "@/lib/services/uicons.svelte";
	import SearchItem from "@/components/ui/search/SearchItem.svelte";
	import type { FuzzyResult } from "@nozbe/microfuzz";
	import { setActiveSearchPokemon } from "@/lib/features/activeSearch.svelte";
	import { getFeatureJump } from "@/lib/utils/geo";
	import { flyTo } from "@/lib/map/utils";
	import { closeModal, closeSearchModal } from "@/lib/ui/modal.svelte";
	import type { AreaSearchEntry } from "@/lib/services/search.svelte.ts";
	import { m } from "@/lib/paraglide/messages";

	let {
		result
	}: {
		result: FuzzyResult<AreaSearchEntry>
	} = $props();
</script>

<SearchItem
	{result}
	onselect={() => {
		const jumpTo = getFeatureJump(result.item.feature)
		flyTo(jumpTo.coords, jumpTo.zoom)
		closeSearchModal()
	}}
	identifier={m.area()}
/>