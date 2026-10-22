<script lang="ts">
	import FiltersetModal from "@/components/menus/filters/filterset/FiltersetModal.svelte";
	import AttributeChip from "@/components/menus/filters/filterset/AttributeChip.svelte";
	import Attribute from "@/components/menus/filters/filterset/Attribute.svelte";
	import AttributesOverview from "@/components/menus/filters/filterset/AttributesOverview.svelte";
	import SliderRange from "@/components/ui/input/slider/SliderRange.svelte";
	import type { FiltersetPokemon } from "@/lib/features/filters/filtersets";
	import { makeAttributePokemonLabel } from "@/lib/features/filters/makeAttributeChipLabel";
	import { getCurrentSelectedFilterset } from "@/lib/features/filters/filtersetPageData.svelte.js";

	import AppearanceAttribute from "@/components/menus/filters/filterset/pokemon/AppearanceAttribute.svelte";
	import { changeAttributeMinMax } from "@/lib/features/filters/filtersetUtils.svelte";
	import AppearanceChips from "@/components/menus/filters/filterset/pokemon/AppearanceChips.svelte";
	import IvChips from "@/components/menus/filters/filterset/pokemon/IvChips.svelte";
	import IvAttribute from "@/components/menus/filters/filterset/pokemon/IvAttribute.svelte";
	import {
		getAttributeLabelCp,
		getAttributeLabelLevel,
		getAttributeLabelRank,
		pokemonBounds
	} from "@/lib/features/filters/filterUtilsPokemon";
	import PokemonFilterDisplay from "@/components/menus/filters/filterset/pokemon/PokemonFilterDisplay.svelte";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import PokemonSelectPage from "@/components/menus/filters/filterset/multiselect/PokemonSelectPage.svelte";
	import { getSpawnablePokemon } from "@/lib/features/masterStats.svelte";
	import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
	import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
	import { Features } from "@/lib/utils/features";

	let data: FiltersetPokemon | undefined = $derived(getCurrentSelectedFilterset()?.data) as
		FiltersetPokemon | undefined;

	let canIv = $derived(hasFeatureAnywhere(getUserDetails().permissions, Features.POKEMON_IV));
	let canPvp = $derived(hasFeatureAnywhere(getUserDetails().permissions, Features.POKEMON_PVP));
</script>

<FiltersetModal
	modalType="filtersetPokemon"
	mapObject={MapObjectType.POKEMON}
	majorCategory="pokemon"
	titleBase="Pokémon Filter"
	titleShared="Shared Pokémon Filter"
	titleNew="New Pokémon Filter"
	titleEdit="Edit Pokémon Filter"
>
	{#snippet base()}
		{#if data}
			<PokemonFilterDisplay {data} />
		{/if}
	{/snippet}
	{#snippet overview()}
		{#if data}
			<AttributesOverview>
				<Attribute label="Species">
					<AttributeChip
						label={makeAttributePokemonLabel(data.pokemon ?? [])}
						isEmpty={!data.pokemon}
						onremove={() => delete data.pokemon}
					/>
					{#snippet page(thisData: FiltersetPokemon)}
						<!--						<SpeciesAttribute data={thisData} />-->
						<PokemonSelectPage
							data={thisData}
							attribute="pokemon"
							pokemonList={getSpawnablePokemon()}
						/>
					{/snippet}
				</Attribute>
				<Attribute label="Cosmetics">
					<AppearanceChips {data} sizeBounds={pokemonBounds.size} showSize={canIv} />
					{#snippet page(thisData: FiltersetPokemon)}
						<AppearanceAttribute data={thisData} sizeBounds={pokemonBounds.size} showSize={canIv} />
					{/snippet}
				</Attribute>
			</AttributesOverview>
			{#if canIv}
				<AttributesOverview>
					<Attribute label="IVs">
						<IvChips {data} ivBounds={pokemonBounds.iv} percBounds={pokemonBounds.ivProduct} />
						{#snippet page(thisData: FiltersetPokemon)}
							<IvAttribute
								data={thisData}
								ivBounds={pokemonBounds.iv}
								percBounds={pokemonBounds.ivProduct}
							/>
						{/snippet}
					</Attribute>
					<Attribute label={/* @wc-include */ "CP"}>
						<AttributeChip
							label={getAttributeLabelCp(data?.cp)}
							isEmpty={!data.cp}
							onremove={() => delete data.cp}
						/>
						{#snippet page(thisData: FiltersetPokemon)}
							<SliderRange
								min={pokemonBounds.cp.min}
								max={pokemonBounds.cp.max}
								title={/* @wc-include */ "CP"}
								valueMin={thisData.cp?.min ?? pokemonBounds.cp.min}
								valueMax={thisData.cp?.max ?? pokemonBounds.cp.max}
								onchange={([min, max]) =>
									changeAttributeMinMax(
										thisData,
										"cp",
										pokemonBounds.cp.min,
										pokemonBounds.cp.max,
										min,
										max
									)}
							/>
						{/snippet}
					</Attribute>
					<Attribute label="Level">
						<AttributeChip
							label={getAttributeLabelLevel(data?.level)}
							isEmpty={!data.level}
							onremove={() => delete data.level}
						/>
						{#snippet page(thisData: FiltersetPokemon)}
							<SliderRange
								min={pokemonBounds.level.min}
								max={pokemonBounds.level.max}
								title="Level"
								valueMin={thisData.level?.min ?? pokemonBounds.level.min}
								valueMax={thisData.level?.max ?? pokemonBounds.level.max}
								onchange={([min, max]) =>
									changeAttributeMinMax(
										thisData,
										"level",
										pokemonBounds.level.min,
										pokemonBounds.level.max,
										min,
										max
									)}
							/>
						{/snippet}
					</Attribute>
				</AttributesOverview>
			{/if}

			{#if canPvp}
				<AttributesOverview>
					<Attribute label="Little League">
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
								onchange={([min, max]) =>
									changeAttributeMinMax(
										thisData,
										"pvpRankLittle",
										pokemonBounds.rank.min,
										pokemonBounds.rank.max,
										min,
										max
									)}
							/>
						{/snippet}
					</Attribute>
					<Attribute label="Great League">
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
								onchange={([min, max]) =>
									changeAttributeMinMax(
										thisData,
										"pvpRankGreat",
										pokemonBounds.rank.min,
										pokemonBounds.rank.max,
										min,
										max
									)}
							/>
						{/snippet}
					</Attribute>
					<Attribute label="Ultra League">
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
								onchange={([min, max]) =>
									changeAttributeMinMax(
										thisData,
										"pvpRankUltra",
										pokemonBounds.rank.min,
										pokemonBounds.rank.max,
										min,
										max
									)}
							/>
						{/snippet}
					</Attribute>
				</AttributesOverview>
			{/if}
		{/if}
	{/snippet}
</FiltersetModal>
