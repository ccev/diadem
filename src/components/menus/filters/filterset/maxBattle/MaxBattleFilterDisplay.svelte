<script lang="ts">
	import type { FiltersetMaxBattle } from "@/lib/features/filters/filtersets";
	import PokemonDisplay from "@/components/menus/filters/filterset/display/PokemonDisplay.svelte";
	import FilterDisplay from "@/components/menus/filters/filterset/display/FilterDisplay.svelte";
	import AttributeDisplay from "@/components/menus/filters/filterset/display/AttributeDisplay.svelte";
	import * as m from "@/lib/paraglide/messages";

	let {
		data
	}: {
		data: FiltersetMaxBattle;
	} = $props();
</script>

<FilterDisplay>
	{#if data.bosses}
		<PokemonDisplay label={m.raid_bosses()} pokemon={data.bosses} />
	{/if}
	{#if data.isActive}
		<AttributeDisplay label={m.max_battle_only_show()} value={m.max_battle_active()} />
	{/if}
	{#if data.hasGmax}
		<AttributeDisplay label={m.max_battle_power_spot_has()} value={m.max_battle_gmax()} />
	{/if}
</FilterDisplay>
