<script lang="ts">
	import type { FiltersetRaid } from "@/lib/features/filters/filtersets";
	import BossSelectPage from "@/components/menus/filters/filterset/multiselect/BossSelectPage.svelte";
	import { getActiveRaids } from "@/lib/features/masterStats.svelte";
	import { mRaid } from "@/lib/services/ingameLocale";
	import type { PokemonVisual } from "@/lib/types/mapObjectData/pokemon";

	let {
		data
	}: {
		data: FiltersetRaid;
	} = $props();

	function onselect(pokemon: PokemonVisual, isSelected: boolean) {
		if (!isSelected) {
			data.bosses = data.bosses?.filter(
				(p) => p.pokemon_id !== pokemon.pokemon_id || p.form !== pokemon.form
			);
		} else {
			if (!data.bosses) data.bosses = [];
			data.bosses.push({
				pokemon_id: pokemon.pokemon_id,
				form: pokemon.form ?? 0,
				temp_evolution_id: pokemon.temp_evolution_id ?? undefined
			});
		}

		if (data.bosses?.length === 0) delete data.bosses;
	}
</script>

<BossSelectPage
	bosses={getActiveRaids()}
	selected={data?.bosses ?? []}
	{onselect}
	getLevelTitle={(level) => mRaid(level, true)}
/>
