<script lang="ts">
	import type { FiltersetPokemon, FiltersetRaid } from "@/lib/features/filters/filtersets";
	import { getSpawnablePokemon } from "@/lib/services/masterfile";
	import PokemonSelect from "@/components/menus/filters/filterset/PokemonSelect.svelte";
	import Toggle from "@/components/ui/input/Toggle.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { onSettingsChange } from "@/lib/services/settings";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import { getActiveRaids } from "@/lib/features/masterStats.svelte";
	import { mRaid } from "@/lib/services/ingameLocale";
	import { resize } from "@/lib/services/assets";
	import { getIconRaidEgg } from "@/lib/services/uicons.svelte";

	let {
		data
	}: {
		data: FiltersetRaid
	} = $props();

	const availableBosses = getActiveRaids();
	const uniqueLevels = [...new Set(availableBosses.map(b => b.level))];
	let showAvailable: boolean = $state(availableBosses.length > 0);

	function onselect(pokemon: { pokemon_id: number, form: number }, isSelected: boolean) {
		if (isSelected) {
			data.bosses = data.bosses?.filter(p => p.pokemon_id !== pokemon.pokemon_id || p.form !== pokemon.form);
		} else {
			if (!data.bosses) data.bosses = [];
			data.bosses.push(pokemon);
		}

		if (data.bosses?.length === 0) delete data.bosses;
	}
</script>

{#if availableBosses.length > 0}
	<Toggle
		title={m.raid_boss_select_available()}
		onclick={() => showAvailable = !showAvailable}
		value={showAvailable}
	/>
{/if}

{#if showAvailable}
	<div class="overflow-y-auto h-102 -mx-1 px-4">
		{#each uniqueLevels as raidLevel (raidLevel)}
			<div class="flex gap-2 items-center py-2 mt-3">
				<img
					class="w-5"
					src={resize(getIconRaidEgg(raidLevel), { width: 64 })}
					alt={mRaid(raidLevel, true)}
				>
				<span class="font-semibold">
					{mRaid(raidLevel, true)}
				</span>
			</div>
			<div class="flex flex-wrap  mt-2">
				<PokemonSelect
					pokemonList={availableBosses.filter(b => b.level === raidLevel)}
					selected={data?.bosses ?? []}
					{onselect}
				/>
			</div>
		{/each}
	</div>
{:else}
	<div class="overflow-y-auto h-102 flex flex-wrap -mx-4 px-4 mt-2">
		<PokemonSelect
			pokemonList={getSpawnablePokemon()}
			selected={data?.bosses ?? []}
			{onselect}
		/>
	</div>
{/if}