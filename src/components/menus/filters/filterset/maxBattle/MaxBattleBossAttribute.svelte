<script lang="ts">
	import type { FiltersetMaxBattle } from "@/lib/features/filters/filtersets";
	import BossSelectPage from "@/components/menus/filters/filterset/multiselect/BossSelectPage.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { getActiveMaxBattles } from "@/lib/features/masterStats.svelte";
	import type { PokemonVisual } from "@/lib/types/mapObjectData/pokemon";

	let {
		data
	}: {
		data: FiltersetMaxBattle;
	} = $props();

	function onselect(pokemon: PokemonVisual, isSelected: boolean) {
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
				form: pokemon.form ?? 0,
				bread_mode: pokemon.bread_mode
			});
		}

		if (data.bosses?.length === 0) delete data.bosses;
	}
</script>

<BossSelectPage
	bosses={getActiveMaxBattles()}
	selected={data?.bosses ?? []}
	{onselect}
	getLevelTitle={(level) => m.x_star_max_battles({ level })}
/>
