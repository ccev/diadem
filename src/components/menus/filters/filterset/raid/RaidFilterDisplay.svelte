<script lang="ts">
	import type { FiltersetRaid } from "@/lib/features/filters/filtersets";
	import {
		getAttributeLabelCp,
		getAttributeLabelIvProduct,
		getAttributeLabelIvValues,
		getAttributeLabelLevel,
		getAttributeLabelRank,
		getAttributeLabelSize
	} from "@/lib/features/filters/filterUtilsPokemon";
	import * as m from "@/lib/paraglide/messages";
	import { getGenderLabel } from "@/lib/utils/pokemonUtils";
	import AttributeDisplay from "@/components/menus/filters/filterset/display/AttributeDisplay.svelte";
	import PokemonDisplay from "@/components/menus/filters/filterset/display/PokemonDisplay.svelte";
	import FilterDisplay from "@/components/menus/filters/filterset/display/FilterDisplay.svelte";
	import HorizontalScrollDisplay from "@/components/menus/filters/filterset/display/HorizontalScrollDisplay.svelte";
	import HorizontalScrollElement from "@/components/menus/filters/filterset/display/HorizontalScrollElement.svelte";
	import { resize } from "@/lib/services/assets";
	import { getIconRaidEgg } from "@/lib/services/uicons.svelte";
	import { mRaid } from "@/lib/services/ingameLocale";
	import { makeAttributeRaidShowLabel } from "@/lib/features/filters/makeAttributeChipLabel";

	let {
		data
	}: {
		data: FiltersetRaid
	} = $props()
</script>

<FilterDisplay>
	{#if data.bosses}
		<PokemonDisplay label="Bosses" pokemon={data.bosses} />
	{/if}
	{#if data.levels}
		<HorizontalScrollDisplay label="Raid Levels">
			{#each data.levels as raidLevel (raidLevel)}
				<HorizontalScrollElement>
					<img
						class="w-7"
						src={resize(getIconRaidEgg(raidLevel), { width: 64 })}
						alt={mRaid(raidLevel, true)}
					>
					{mRaid(raidLevel, true)}
				</HorizontalScrollElement>
			{/each}
		</HorizontalScrollDisplay>
	{/if}
	{#if data.show}
		{#each data.show as show}
			<AttributeDisplay label="Show" value={makeAttributeRaidShowLabel(show)} />
		{/each}
	{/if}
</FilterDisplay>


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
		<AttributeDisplay label={m.little_league()} value={getAttributeLabelRank(data.pvpRankLittle)} />
	{/if}
	{#if data.pvpRankGreat}
		<AttributeDisplay label={m.great_league()} value={getAttributeLabelRank(data.pvpRankGreat)} />
	{/if}
	{#if data.pvpRankUltra}
		<AttributeDisplay label={m.ultra_league()} value={getAttributeLabelRank(data.pvpRankUltra)} />
	{/if}
	{#if data.size}
		<AttributeDisplay label={m.pokemon_size()} value={getAttributeLabelSize(data.size)} />
	{/if}
	{#if data.gender}
		<AttributeDisplay
			label={m.pokemon_gender()}
			value={data.gender.map(getGenderLabel).join(", ")}
		/>
	{/if}
</div>