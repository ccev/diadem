<script lang="ts">
	import type { FiltersetPokemon } from "@/lib/features/filters/filtersets";
	import {
		getAttributeLabelCp,
		getAttributeLabelIvProduct,
		getAttributeLabelIvValues,
		getAttributeLabelLevel,
		getAttributeLabelRank,
		getAttributeLabelSize
	} from "@/lib/features/filters/filterUtilsPokemon";

	import { getGenderLabel } from "@/lib/utils/pokemonUtils";
	import AttributeDisplay from "@/components/menus/filters/filterset/display/AttributeDisplay.svelte";
	import PokemonDisplay from "@/components/menus/filters/filterset/display/PokemonDisplay.svelte";
	import FilterDisplay from "@/components/menus/filters/filterset/display/FilterDisplay.svelte";

	let {
		data
	}: {
		data: FiltersetPokemon;
	} = $props();
</script>

<FilterDisplay class="max-h-96">
	{#if data.pokemon}
		<PokemonDisplay label="Species" pokemon={data.pokemon} />
	{/if}

	{#if data.iv}
		<AttributeDisplay label="Total IV" value={getAttributeLabelIvProduct(data.iv)} />
	{/if}
	{#if data.ivAtk || data.ivDef || data.ivSta}
		<AttributeDisplay
			label="IVs"
			value={getAttributeLabelIvValues(data.ivAtk, data.ivDef, data.ivSta)}
		/>
	{/if}
	{#if data.cp}
		<AttributeDisplay label={/* @wc-include */ "CP"} value={getAttributeLabelCp(data.cp)} />
	{/if}
	{#if data.level}
		<AttributeDisplay label="Level" value={getAttributeLabelLevel(data.level)} />
	{/if}
	{#if data.pvpRankLittle}
		<AttributeDisplay label="Little League" value={getAttributeLabelRank(data.pvpRankLittle)} />
	{/if}
	{#if data.pvpRankGreat}
		<AttributeDisplay label="Great League" value={getAttributeLabelRank(data.pvpRankGreat)} />
	{/if}
	{#if data.pvpRankUltra}
		<AttributeDisplay label="Ultra League" value={getAttributeLabelRank(data.pvpRankUltra)} />
	{/if}
	{#if data.size}
		<AttributeDisplay label="Size" value={getAttributeLabelSize(data.size)} />
	{/if}
	{#if data.gender}
		<AttributeDisplay label="Gender" value={data.gender.map(getGenderLabel).join(", ")} />
	{/if}
</FilterDisplay>
