<script lang="ts">
	import type { FiltersetPokemon } from '@/lib/features/filters/filtersets';
	import {
		getAttributeLabelCp,
		getAttributeLabelIvProduct,
		getAttributeLabelIvValues, getAttributeLabelLevel, getAttributeLabelSize
	} from '@/lib/features/filters/pokemonFilterUtils';
	import AttributeDisplay from '@/components/menus/filters/filterset/AttributeDisplay.svelte';
	import * as m from "@/lib/paraglide/messages";
	import { getGenderLabel } from '@/lib/utils/pokemonUtils';
	import { getIconPokemon } from '@/lib/services/uicons.svelte';
	import { mPokemon } from '@/lib/services/ingameLocale';

	let {
		data
	}: {
		data: FiltersetPokemon
	} = $props()
</script>

{#if data.pokemon}
	<AttributeDisplay
		label={m.species()}
		class="w-full mb-3 pb-0!"
	>
		<div class="flex overflow-x-auto gap-2 pb-3 mt-1">
			{#each data.pokemon as species}
				<div class="border-border border-1 rounded-lg px-2 py-1 flex gap-2 items-center shrink-0">
					<img
						class="size-9"
						src={getIconPokemon(species)}
						alt={mPokemon(species)}
					>
					<span class="text-base">
						{mPokemon(species)}
					</span>
				</div>
			{/each}
		</div>
	</AttributeDisplay>
{/if}

<div class="flex flex-wrap gap-x-2 gap-y-3">
	{#if data.iv}
		<AttributeDisplay label="Total IV" value={getAttributeLabelIvProduct(data.iv)} />
	{/if}
	{#if data.ivAtk || data.ivDef || data.ivSta}
		<AttributeDisplay label={m.pogo_ivs()} value={getAttributeLabelIvValues(data.ivAtk, data.ivDef, data.ivSta)} />
	{/if}
	{#if data.cp}
		<AttributeDisplay label={m.cp()} value={getAttributeLabelCp(data.cp)} />
	{/if}
	{#if data.level}
		<AttributeDisplay label={m.level()} value={getAttributeLabelLevel(data.level)} />
	{/if}
	{#if data.pvpRankLittle}
		<AttributeDisplay label={m.little_league()} value={getAttributeLabelLevel(data.pvpRankLittle)} />
	{/if}
	{#if data.pvpRankGreat}
		<AttributeDisplay label={m.great_league()} value={getAttributeLabelLevel(data.pvpRankGreat)} />
	{/if}
	{#if data.pvpRankUltra}
		<AttributeDisplay label={m.ultra_league()} value={getAttributeLabelLevel(data.pvpRankUltra)} />
	{/if}
	{#if data.size}
		<AttributeDisplay label="Size" value={getAttributeLabelSize(data.size)} />
	{/if}
	{#if data.gender}
		<AttributeDisplay
			label={m.pokemon_gender()}
			value={data.gender.map(getGenderLabel).join(", ")}
		/>
	{/if}
</div>