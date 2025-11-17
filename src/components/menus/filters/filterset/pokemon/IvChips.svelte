<script lang="ts">
	import { makeAttributeRangeLabel } from '@/lib/features/filters/makeAttributeChipLabel';
	import * as m from '@/lib/paraglide/messages';
	import AttributeChip from '@/components/menus/filters/filterset/AttributeChip.svelte';
	import type { FiltersetPokemon, MinMax } from '@/lib/features/filters/filtersets';
	import { getAttributeLabelIvProduct, getAttributeLabelIvValues } from '@/lib/features/filters/pokemonFilterUtils';

	let {
		data,
		ivBounds,
		percBounds
	}: {
		data: FiltersetPokemon
		ivBounds: MinMax
		percBounds: MinMax
	} = $props();
</script>

{#if data.iv}
	<AttributeChip
		label={getAttributeLabelIvProduct(data.iv)}
		isEmpty={false}
		onremove={() => delete data.iv}
	/>
{/if}
{#if data.ivAtk || data.ivDef || data.ivSta}
	<AttributeChip
		label={getAttributeLabelIvValues(data.ivAtk, data.ivDef, data.ivSta)}
		isEmpty={false}
		onremove={() => {
			delete data.ivAtk;
			delete data.ivDef;
			delete data.ivSta;
		}}
	/>
{/if}
{#if !data.iv && !data.ivAtk && !data.ivDef && !data.ivSta}
	<AttributeChip isEmpty={true} />
{/if}