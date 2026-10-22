<script lang="ts">
	import type { FiltersetMaxBattle } from "@/lib/features/filters/filtersets";
	import PokemonDisplay from "@/components/menus/filters/filterset/display/PokemonDisplay.svelte";
	import FilterDisplay from "@/components/menus/filters/filterset/display/FilterDisplay.svelte";
	import AttributeDisplay from "@/components/menus/filters/filterset/display/AttributeDisplay.svelte";

	let {
		data
	}: {
		data: FiltersetMaxBattle;
	} = $props();
</script>

<FilterDisplay>
	{#if data.bosses}
		<PokemonDisplay label="Bosses" pokemon={data.bosses} />
	{/if}
	{#if data.isActive}
		<AttributeDisplay label="Only show" value="Active" />
	{/if}
	{#if data.hasGmax}
		<AttributeDisplay label="Power spot has" value="Gigantamax" />
	{/if}
</FilterDisplay>
