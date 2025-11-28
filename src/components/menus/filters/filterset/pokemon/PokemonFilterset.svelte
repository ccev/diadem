<script lang="ts">
	import FiltersetModal from '@/components/menus/filters/filterset/FiltersetModal.svelte';
	import AttributeChip from '@/components/menus/filters/filterset/AttributeChip.svelte';
	import Attribute from '@/components/menus/filters/filterset/Attribute.svelte';
	import AttributesOverview from '@/components/menus/filters/filterset/AttributesOverview.svelte';
	import SliderRange from '@/components/ui/input/slider/SliderRange.svelte';
	import type { FiltersetPokemon } from '@/lib/features/filters/filtersets';
	import { makeAttributePokemonLabel } from '@/lib/features/filters/makeAttributeChipLabel';
	import { getCurrentSelectedFilterset } from '@/lib/features/filters/filtersetPageData.svelte.js';
	import * as m from '@/lib/paraglide/messages';
	import AppearanceAttribute from '@/components/menus/filters/filterset/pokemon/AppearanceAttribute.svelte';
	import { changeAttributeMinMax } from '@/lib/features/filters/filtersetUtils';
	import AppearanceChips from '@/components/menus/filters/filterset/pokemon/AppearanceChips.svelte';
	import IvChips from '@/components/menus/filters/filterset/pokemon/IvChips.svelte';
	import IvAttribute from '@/components/menus/filters/filterset/pokemon/IvAttribute.svelte';
	import SpeciesAttribute from '@/components/menus/filters/filterset/pokemon/SpeciesAttribute.svelte';
	import {
		getAttributeLabelCp,
		getAttributeLabelLevel,
		getAttributeLabelRank,
		pokemonBounds
	} from '@/lib/features/filters/filterUtilsPokemon';
	import PokemonAttributeOverview from '@/components/menus/filters/filterset/pokemon/PokemonAttributeOverview.svelte';

	let data: FiltersetPokemon | undefined = $derived(getCurrentSelectedFilterset()?.data) as | FiltersetPokemon | undefined;
</script>

<FiltersetModal
	modalType="filtersetPokemon"
	category="pokemon"
	titleBase={m.pokemon_filter()}
	titleShared={m.shared_pokemon_filter()}
	titleNew={m.filterset_title_new_pokemon()}
	titleEdit={m.filterset_title_edit_pokemon()}
	height={134}
>
	{#snippet base()}
		{#if data}
			<PokemonAttributeOverview {data} />
		{/if}
	{/snippet}
	{#snippet overview()}
		{#if data}
			<AttributesOverview>
				<Attribute label={m.species()}>
					<AttributeChip
						label={makeAttributePokemonLabel(data.pokemon ?? [])}
						isEmpty={!data.pokemon}
						onremove={() => delete data.pokemon}
					/>
					{#snippet page(thisData: FiltersetPokemon)}
						<SpeciesAttribute data={thisData} />
					{/snippet}
				</Attribute>
				<Attribute label="Appearance">
					<AppearanceChips {data} sizeBounds={pokemonBounds.size} />
					{#snippet page(thisData: FiltersetPokemon)}
						<AppearanceAttribute data={thisData} sizeBounds={pokemonBounds.size} />
					{/snippet}
				</Attribute>
			</AttributesOverview>
			<AttributesOverview>
				<Attribute label={m.pogo_ivs()}>
					<IvChips {data} ivBounds={pokemonBounds.iv} percBounds={pokemonBounds.ivProduct} />
					{#snippet page(thisData: FiltersetPokemon)}
						<IvAttribute data={thisData} ivBounds={pokemonBounds.iv} percBounds={pokemonBounds.ivProduct} />
					{/snippet}
				</Attribute>
				<Attribute label={m.cp()}>
					<AttributeChip
						label={getAttributeLabelCp(data?.cp)}
						isEmpty={!data.cp}
						onremove={() => delete data.cp}
					/>
					{#snippet page(thisData: FiltersetPokemon)}
						<SliderRange
							min={pokemonBounds.cp.min}
							max={pokemonBounds.cp.max}
							title={m.cp()}
							valueMin={thisData.cp?.min ?? pokemonBounds.cp.min}
							valueMax={thisData.cp?.max ?? pokemonBounds.cp.max}
							onchange={([min, max]) => changeAttributeMinMax(thisData, "cp", pokemonBounds.cp.min, pokemonBounds.cp.max, min, max)}
						/>
					{/snippet}
				</Attribute>
				<Attribute label={m.level()}>
					<AttributeChip
						label={getAttributeLabelLevel(data?.level)}
						isEmpty={!data.level}
						onremove={() => delete data.level}
					/>
					{#snippet page(thisData: FiltersetPokemon)}
						<SliderRange
							min={pokemonBounds.level.min}
							max={pokemonBounds.level.max}
							title={m.level()}
							valueMin={thisData.level?.min ?? pokemonBounds.level.min}
							valueMax={thisData.level?.max ?? pokemonBounds.level.max}
							onchange={([min, max]) => changeAttributeMinMax(thisData, "level", pokemonBounds.level.min, pokemonBounds.level.max, min, max)}
						/>
					{/snippet}
				</Attribute>
			</AttributesOverview>

			<AttributesOverview>
				<Attribute label={m.little_league()}>
					<AttributeChip
						label={getAttributeLabelRank(data?.pvpRankLittle)}
						isEmpty={!data.pvpRankLittle}
						onremove={() => delete data.pvpRankLittle}
					/>
					{#snippet page(thisData: FiltersetPokemon)}
						<SliderRange
							min={pokemonBounds.rank.min}
							max={pokemonBounds.rank.max}
							title="Little League Rank"
							valueMin={thisData.pvpRankLittle?.min ?? pokemonBounds.rank.min}
							valueMax={thisData.pvpRankLittle?.max ?? pokemonBounds.rank.max}
							onchange={([min, max]) => changeAttributeMinMax(thisData, "pvpRankLittle", pokemonBounds.rank.min, pokemonBounds.rank.max, min, max)}
						/>
					{/snippet}
				</Attribute>
				<Attribute label={m.great_league()}>
					<AttributeChip
						label={getAttributeLabelRank(data?.pvpRankGreat)}
						isEmpty={!data.pvpRankGreat}
						onremove={() => delete data.pvpRankGreat}
					/>
					{#snippet page(thisData: FiltersetPokemon)}
						<SliderRange
							min={pokemonBounds.rank.min}
							max={pokemonBounds.rank.max}
							title="Great League Rank"
							valueMin={thisData.pvpRankGreat?.min ?? pokemonBounds.rank.min}
							valueMax={thisData.pvpRankGreat?.max ?? pokemonBounds.rank.max}
							onchange={([min, max]) => changeAttributeMinMax(thisData, "pvpRankGreat", pokemonBounds.rank.min, pokemonBounds.rank.max, min, max)}
						/>
					{/snippet}
				</Attribute>
				<Attribute label={m.ultra_league()}>
					<AttributeChip
						label={getAttributeLabelRank(data?.pvpRankUltra)}
						isEmpty={!data.pvpRankUltra}
						onremove={() => delete data.pvpRankUltra}
					/>
					{#snippet page(thisData: FiltersetPokemon)}
						<SliderRange
							min={pokemonBounds.rank.min}
							max={pokemonBounds.rank.max}
							title="Ultra League Rank"
							valueMin={thisData.pvpRankUltra?.min ?? pokemonBounds.rank.min}
							valueMax={thisData.pvpRankUltra?.max ?? pokemonBounds.rank.max}
							onchange={([min, max]) => changeAttributeMinMax(thisData, "pvpRankUltra", pokemonBounds.rank.min, pokemonBounds.rank.max, min, max)}
						/>
					{/snippet}
				</Attribute>
			</AttributesOverview>
		{/if}
	{/snippet}
</FiltersetModal>
