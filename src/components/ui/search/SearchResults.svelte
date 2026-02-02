<script lang="ts">
	import type { FuzzyResult } from "@nozbe/microfuzz";
	import { type AnySearchEntry, SearchableType } from "@/lib/services/search.svelte";
	import {
		setActiveSearchContest, setActiveSearchInvasion,
		setActiveSearchKecleon, setActiveSearchLure,
		setActiveSearchPokemon,
		setActiveSearchQuest, setActiveSearchRaidBoss, setActiveSearchRaidLevel
	} from "@/lib/features/activeSearch.svelte";
	import { resize } from "@/lib/services/assets";
	import {
		getIconInvasion,
		getIconPokemon,
		getIconPokestop,
		getIconRaidEgg,
		getIconReward
	} from "@/lib/services/uicons.svelte";
	import SearchItem from "@/components/ui/search/SearchItem.svelte";
	import { m } from "@/lib/paraglide/messages";
	import { getFeatureJump } from "@/lib/utils/geo";
	import { flyTo } from "@/lib/map/utils";
	import { closeSearchModal } from "@/lib/ui/modal.svelte";
	import { getContestIcon, KECLEON_ID } from "@/lib/utils/pokestopUtils";

	let {
		results
	}: {
		results: FuzzyResult<AnySearchEntry>[]
	} = $props()
</script>

{#each results as result}
	{@const entry = result.item}
	{#if entry.type === SearchableType.POKEMON}
		<SearchItem
			{result}
			onselect={() => {
				setActiveSearchPokemon(entry.name, { pokemon_id: entry.id, form: entry.form })
			}}
			imageUrl={resize(getIconPokemon({ pokemon_id: entry.id, form: entry.form }), { width: 64 })}
		/>
	{:else if entry.type === SearchableType.AREA}
		<SearchItem
			{result}
			onselect={() => {
				const jumpTo = getFeatureJump(entry.feature)
				flyTo(jumpTo.coords, jumpTo.zoom)
				closeSearchModal()
			}}
		/>
	{:else if entry.type === SearchableType.QUEST}
		<SearchItem
			{result}
			onselect={() => {
				setActiveSearchQuest(entry.name, entry.reward)
			}}
			imageUrl={resize(getIconReward(entry.reward.type, entry.reward.info), { width: 64 })}
		/>
	{:else if entry.type === SearchableType.KECLEON}
		<SearchItem
			{result}
			onselect={() => {
				setActiveSearchKecleon(entry.name)
			}}
			imageUrl={resize(getIconPokemon({ pokemon_id: KECLEON_ID }), { width: 64 })}
		/>
	{:else if entry.type === SearchableType.CONTEST}
		<SearchItem
			{result}
			onselect={() => {
				setActiveSearchContest(entry.name, entry.rankingStandard, entry.focus)
			}}
			imageUrl={resize(getContestIcon(entry.focus), { width: 64 })}
		/>
	{:else if entry.type === SearchableType.LURE}
		<SearchItem
			{result}
			onselect={() => {
				setActiveSearchLure(entry.name, entry.itemId)
			}}
			imageUrl={resize(getIconPokestop({ lure_id: entry.itemId, lure_expire_timestamp: Infinity }), { width: 64 })}
		/>
	{:else if entry.type === SearchableType.INVASION}
		<SearchItem
			{result}
			onselect={() => {
				setActiveSearchInvasion(entry.name, entry.characterId)
			}}
			imageUrl={resize(getIconInvasion(entry.characterId, true), { width: 64 })}
		/>
	{:else if entry.type === SearchableType.RAID_BOSS}
		<SearchItem
			{result}
			onselect={() => {
				setActiveSearchRaidBoss(entry.name, entry.pokemon_id, entry.form_id)
			}}
			imageUrl={resize(getIconPokemon({ pokemon_id: entry.pokemon_id, form: entry.form_id }), { width: 64 })}
		/>
	{:else if entry.type === SearchableType.RAID_LEVEL}
		<SearchItem
			{result}
			onselect={() => {
				setActiveSearchRaidLevel(entry.name, entry.level)
			}}
			imageUrl={resize(getIconRaidEgg(entry.level), { width: 64 })}
		/>
	{/if}
{/each}