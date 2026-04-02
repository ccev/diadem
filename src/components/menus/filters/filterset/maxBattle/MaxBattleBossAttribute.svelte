<script lang="ts">
	import type { FiltersetMaxBattle } from "@/lib/features/filters/filtersets";
	import { getSpawnablePokemon } from "@/lib/services/masterfile";
	import PokemonSelect from "@/components/menus/filters/filterset/PokemonSelect.svelte";
	import Toggle from "@/components/ui/input/Toggle.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { getActiveMaxBattles } from "@/lib/features/masterStats.svelte";

	let {
		data
	}: {
		data: FiltersetMaxBattle;
	} = $props();

	const availableBosses = getActiveMaxBattles();
	let showAvailable: boolean = $state(availableBosses.length > 0);

	function onselect(
		pokemon: { pokemon_id: number; form: number; bread_mode?: number },
		isSelected: boolean
	) {
		if (!isSelected) {
			data.bosses = data.bosses?.filter(
				(p) =>
					!(
						p.pokemon_id === pokemon.pokemon_id &&
						p.form === pokemon.form &&
						(pokemon.bread_mode === undefined || p.bread_mode === pokemon.bread_mode)
					)
			);
		} else {
			if (!data.bosses) data.bosses = [];
			data.bosses.push({
				pokemon_id: pokemon.pokemon_id,
				form: pokemon.form,
				bread_mode: pokemon.bread_mode
			});
		}

		if (data.bosses?.length === 0) delete data.bosses;
	}
</script>

{#if availableBosses.length > 0}
	<Toggle
		title={m.max_battle_boss_select_available()}
		onclick={() => (showAvailable = !showAvailable)}
		value={showAvailable}
	/>
{/if}

{#if showAvailable}
	<div class="overflow-y-auto h-102 flex flex-wrap -mx-4 px-4 mt-2">
		<PokemonSelect
			pokemonList={availableBosses}
			selected={data?.bosses ?? []}
			{onselect}
			getKey={(pokemon) => `${pokemon.pokemon_id}-${pokemon.form}-${pokemon.bread_mode}`}
		/>
	</div>
{:else}
	<div class="overflow-y-auto h-102 flex flex-wrap -mx-4 px-4 mt-2">
		<PokemonSelect pokemonList={getSpawnablePokemon()} selected={data?.bosses ?? []} {onselect} />
	</div>
{/if}
