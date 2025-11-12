<script lang="ts">
	import FiltersetModal from '@/components/menus/filters/filterset/FiltersetModal.svelte';
	import AttributeChip from '@/components/menus/filters/filterset/AttributeChip.svelte';
	import Attribute from '@/components/menus/filters/filterset/Attribute.svelte';
	import AttributesOverview from '@/components/menus/filters/filterset/AttributesOverview.svelte';
	import PageAttribute from '@/components/menus/filters/filterset/PageAttribute.svelte';
	import SliderRange from '@/components/ui/input/SliderRange.svelte';
	import type { FiltersetPokemon } from '@/lib/features/filters/filtersets';
	import { makeAttributePokemonLabel, makeAttributeRangeLabel } from '@/lib/features/filters/makeAttributeChipLabel';
	import { getNewFilterset } from '@/lib/features/filters/manageFilters';
	import * as m from '@/lib/paraglide/messages';

	const consts = {
		ivProduct: {
			min: 0,
			max: 100
		},
		iv: {
			min: 0,
			max: 15
		},
		cp: {
			min: 0,
			max: 5000
		},
		level: {
			min: 0,
			max: 50
		},
		rank: {
			min: 1,
			max: 100
		}
	};

	let {
		data = undefined,
		isInEdit,
		isNew
	}: {
		data?: FiltersetPokemon,
		isInEdit: boolean;
		isNew: boolean;
	} = $props();

	// TODO move this outside
	if (!data) {
		data = getNewFilterset();
		data.pokemon = [{ pokemon_id: 1, form: 0 }];
	}

	function changeAttributeMinMax(attribute: keyof FiltersetPokemon, constsKey: keyof consts, min: number, max: number) {
		if (min === consts[constsKey].min && max === consts[constsKey].max) {
			delete data[attribute]
		} else {
			data[attribute] = { min, max }
		}
	}
</script>

<FiltersetModal
	modalType="filtersetPokemon"
	modalTitle={isNew ? m.filterset_title_new_pokemon() : m.filterset_title_edit_pokemon()}
	{isInEdit}
	initialPage={isInEdit ? "overview" : "new"}
>
	{#snippet overview()}
		<AttributesOverview>
			<Attribute
				label={m.species()}
			>
				<AttributeChip
					label={makeAttributePokemonLabel(data.pokemon ?? [])}
					isEmpty={!data.pokemon}
					onremove={() => delete data.pokemon}
				/>
				{#snippet page()}
					<PageAttribute>
						<div>test</div>
					</PageAttribute>
				{/snippet}
			</Attribute>
		</AttributesOverview>
		<AttributesOverview>
			<Attribute
				label={m.pogo_ivs()}
			>
				{#if data.iv}
					<AttributeChip
						label={makeAttributeRangeLabel(
							data.iv,
							consts.ivProduct.min,
							consts.ivProduct.max,
							m.x_percentage({ x: data.iv?.min ?? consts.ivProduct.min }),
							m.x_percentage({ x: data.iv?.max ?? consts.ivProduct.max }),
						)}
						isEmpty={false}
						onremove={() => delete data.iv}
					/>
				{/if}
				{#if data.ivAtk || data.ivDef || data.ivSta}
					<AttributeChip
						label={makeAttributeRangeLabel(
							{
								min: (data.ivAtk?.min ?? consts.iv.min) + (data.ivDef?.min ?? consts.iv.min) + (data.ivSta?.min ?? consts.iv.min),
								max: (data.ivAtk?.max ?? consts.iv.max) + (data.ivDef?.max ?? consts.iv.max) + (data.ivSta?.max ?? consts.iv.max),
							},
							consts.iv.min * 3,
							consts.iv.max * 3,
							m.atk_def_sta({
								atk: data.ivAtk?.min ?? consts.iv.min,
								def: data.ivDef?.min ?? consts.iv.min,
								sta: data.ivSta?.min ?? consts.iv.min
							}),
							m.atk_def_sta({
								atk: data.ivAtk?.max ?? consts.iv.max,
								def: data.ivDef?.max ?? consts.iv.max,
								sta: data.ivSta?.max ?? consts.iv.max
							}),
						)}
						isEmpty={false}
						onremove={() => {
							delete data.ivAtk
							delete data.ivDef
							delete data.ivSta
						}}
					/>
				{/if}
				{#if !data.iv && !data.ivAtk && !data.ivDef && !data.ivSta}
					<AttributeChip isEmpty={true} />
				{/if}
				{#snippet page()}
					<PageAttribute>
						<SliderRange
							min={consts.ivProduct.min}
							max={consts.ivProduct.max}
							title="IV %"
							valueMin={data.iv?.min ?? consts.ivProduct.min}
							valueMax={data.iv?.max ?? consts.ivProduct.max}
							onchange={([min, max]) => changeAttributeMinMax("iv", "ivProduct", min, max)}
						/>
						<SliderRange
							min={consts.iv.min}
							max={consts.iv.max}
							title="Attack IV"
							valueMin={data.ivAtk?.min ?? consts.iv.min}
							valueMax={data.ivAtk?.max ?? consts.iv.max}
							onchange={([min, max]) => changeAttributeMinMax("ivAtk", "iv", min, max)}
						/>
						<SliderRange
							min={consts.iv.min}
							max={consts.iv.max}
							title="Defense IV"
							valueMin={data.ivDef?.min ?? consts.iv.min}
							valueMax={data.ivDef?.max ?? consts.iv.max}
							onchange={([min, max]) => changeAttributeMinMax("ivDef", "iv", min, max)}
						/>
						<SliderRange
							min={consts.iv.min}
							max={consts.iv.max}
							title="Stamina IV"
							valueMin={data.ivSta?.min ?? consts.iv.min}
							valueMax={data.ivSta?.max ?? consts.iv.max}
							onchange={([min, max]) => changeAttributeMinMax("ivSta", "iv", min, max)}
						/>
					</PageAttribute>
				{/snippet}
			</Attribute>
			<Attribute
				label={m.cp()}
			>
				<AttributeChip
					label={makeAttributeRangeLabel(data.cp, consts.cp.min, consts.cp.max)}
					isEmpty={!data.cp}
					onremove={() => delete data.cp}
				/>
				{#snippet page()}
					<PageAttribute>
						<SliderRange
							min={consts.cp.min}
							max={consts.cp.max}
							title={m.cp()}
							valueMin={data.cp?.min ?? consts.cp.min}
							valueMax={data.cp?.max ?? consts.cp.max}
							onchange={([min, max]) => changeAttributeMinMax("cp", "cp", min, max)}
						/>
					</PageAttribute>
				{/snippet}
			</Attribute>
			<Attribute
				label={m.level()}
			>
				<AttributeChip
					label={makeAttributeRangeLabel(data.level, consts.level.min, consts.level.max)}
					isEmpty={!data.level}
					onremove={() => delete data.level}
				/>
				{#snippet page()}
					<PageAttribute>
						<SliderRange
							min={consts.level.min}
							max={consts.level.max}
							title={m.level()}
							valueMin={data.level?.min ?? consts.level.min}
							valueMax={data.level?.max ?? consts.level.max}
							onchange={([min, max]) => changeAttributeMinMax("level", "level", min, max)}
						/>
					</PageAttribute>
				{/snippet}
			</Attribute>
		</AttributesOverview>

		<AttributesOverview>
			<Attribute
				label={m.little_league()}
			>
				<AttributeChip
					label={m.rank_x({ rank: makeAttributeRangeLabel(data.pvpRankLittle, consts.rank.min, consts.rank.max) })}
					isEmpty={!data.pvpRankLittle}
					onremove={() => delete data.pvpRankLittle}
				/>
				{#snippet page()}
					<PageAttribute>
						<SliderRange
							min={consts.rank.min}
							max={consts.rank.max}
							title="Little League Rank"
							valueMin={data.pvpRankLittle?.min ?? consts.rank.min}
							valueMax={data.pvpRankLittle?.max ?? consts.rank.max}
							onchange={([min, max]) => changeAttributeMinMax("pvpRankLittle", "rank", min, max)}
						/>
					</PageAttribute>
				{/snippet}
			</Attribute>
			<Attribute
				label={m.great_league()}
			>
				<AttributeChip
					label={m.rank_x({ rank: makeAttributeRangeLabel(data.pvpRankGreat, consts.rank.min, consts.rank.max) })}
					isEmpty={!data.pvpRankGreat}
					onremove={() => delete data.pvpRankGreat}
				/>
				{#snippet page()}
					<PageAttribute>
						<SliderRange
							min={consts.rank.min}
							max={consts.rank.max}
							title="Great League Rank"
							valueMin={data.pvpRankGreat?.min ?? consts.rank.min}
							valueMax={data.pvpRankGreat?.max ?? consts.rank.max}
							onchange={([min, max]) => changeAttributeMinMax("pvpRankGreat", "rank", min, max)}
						/>
					</PageAttribute>
				{/snippet}
			</Attribute>
			<Attribute
				label={m.ultra_league()}
			>
				<AttributeChip
					label={m.rank_x({ rank: makeAttributeRangeLabel(data.pvpRankUltra, consts.rank.min, consts.rank.max) })}
					isEmpty={!data.pvpRankUltra}
					onremove={() => delete data.pvpRankUltra}
				/>
				{#snippet page()}
					<PageAttribute>
						<SliderRange
							min={consts.rank.min}
							max={consts.rank.max}
							title="Ultra League Rank"
							valueMin={data.pvpRankUltra?.min ?? consts.rank.min}
							valueMax={data.pvpRankUltra?.max ?? consts.rank.max}
							onchange={([min, max]) => changeAttributeMinMax("pvpRankUltra", "rank", min, max)}
						/>
					</PageAttribute>
				{/snippet}
			</Attribute>
		</AttributesOverview>
	{/snippet}
</FiltersetModal>