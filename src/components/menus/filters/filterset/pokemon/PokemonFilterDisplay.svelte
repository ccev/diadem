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
	import * as m from "@/lib/paraglide/messages";
	import { getGenderLabel } from "@/lib/utils/pokemonUtils";
	import AttributeDisplay from "@/components/menus/filters/filterset/display/AttributeDisplay.svelte";
	import PokemonDisplay from "@/components/menus/filters/filterset/display/PokemonDisplay.svelte";
	import FilterDisplay from "@/components/menus/filters/filterset/display/FilterDisplay.svelte";
	import ModifierPreview from "@/components/menus/filters/filterset/modifiers/ModifierPreview.svelte";
	import { getIconPokemon } from "@/lib/services/uicons.svelte";

	let {
		data
	}: {
		data: FiltersetPokemon
	} = $props()

	let previewIconUrl = $derived.by(() => {
		const pokemon = data?.pokemon;
		const selected = pokemon?.[pokemon.length - 1];
		if (!selected) return undefined;
		return getIconPokemon({ pokemon_id: selected.pokemon_id, form: selected.form });
	});
</script>

<FilterDisplay class="max-h-96">
	{#if data.pokemon}
		<PokemonDisplay label={m.species()} pokemon={data.pokemon} />
	{/if}

	{#if data.iv}
		<AttributeDisplay label={m.iv_product_label_long()} value={getAttributeLabelIvProduct(data.iv)} />
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

	{#if data.modifiers}
		<div class="flex items-center gap-4 w-full">
			<div class="bg-border h-px w-full"></div>
			<span class="text-muted-foreground text-sm whitespace-nowrap">{m.modifier_visual()}</span>
			<div class="bg-border h-px w-full"></div>
		</div>
		<div class="w-full">
			<ModifierPreview modifiers={data.modifiers} iconUrl={previewIconUrl} filterset={data} />
		</div>
	{/if}
</FilterDisplay>