<script module lang="ts">
	import type { MapObjectPopupProps } from "@/components/ui/popups/common/PopupBaseStatic.svelte";

	import { mPokemon } from "$lib/services/ingameLocale";
	import type { MapData } from "$lib/mapObjects/mapObjectTypes";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import OverviewCard from "@/components/ui/popups/common/OverviewCard.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import StatsMainCard from "@/components/ui/popups/common/StatsMainCard.svelte";
	import StatsMainCardEntry from "@/components/ui/popups/common/StatsMainCardEntry.svelte";
	import UpdatedTimes from "@/components/ui/popups/common/UpdatedTimes.svelte";
	import { getIconPokemon } from "$lib/services/uicons.svelte";
	import { formatDecimal, formatNumber, formatPercentage } from "$lib/utils/numberFormat";
	import {
		CircleDot,
		CircleSlash2,
		Info,
		MapPinned,
		RotateCcw,
		Trees,
		VectorSquare
	} from "@lucide/svelte";
	import type { NestData } from "$lib/types/mapObjectData/nest";
	import AccessPolygonMap from "@/components/ui/popups/common/AccessPolygonMap.svelte";
	import QuickSearchButton from "@/components/ui/popups/common/QuickSearchButton.svelte";
	import { setActiveSearchPokemon } from "$lib/features/activeSearch.svelte";
	import PokemonStatsCard from "@/components/ui/popups/common/PokemonStatsCard.svelte";

	export { image, overview, main };

	export function getPopupPropsNest(data: MapData) {
		data = data as NestData;
		return {
			type: "Nest",
			title: `${mPokemon(data)} Nest`,
			image,
			overview,
			main
		} as MapObjectPopupProps;
	}
</script>

{#snippet image(d: MapData)}
	{@const data = d as NestData}
	<div class="size-14 shrink-0">
		<ImagePopup alt={mPokemon(data)} src={getIconPokemon(data)} class="size-14" />
	</div>
{/snippet}

{#snippet overview(d: MapData)}
	{@const data = d as NestData}

	{#if data.name}
		<OverviewCard Icon={Trees} title="Park Name" value={data.name} />
	{/if}

	<OverviewCard
		Icon={RotateCcw}
		title="Spawn Rate"
		value={/* @wc-include */ `~${formatDecimal(data.pokemon_avg)}/hour`}
	/>
	<OverviewCard Icon={MapPinned} title="Spawnpoints" value={formatNumber(data.spawnpoints)} />
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as NestData}

	<TitledMainSection Icon={Info} title="About this Nest">
		<StatsMainCard>
			<StatsMainCardEntry Icon={Trees} name="Park Name" value={data.name ? data.name : "Unknown"} />
			<StatsMainCardEntry
				Icon={RotateCcw}
				name="Spawn Rate"
				value={/* @wc-include */ `~${formatDecimal(data.pokemon_avg)}/hour`}
			/>
			<StatsMainCardEntry
				Icon={MapPinned}
				name="Total Spawnpoints"
				value={formatNumber(data.spawnpoints)}
			/>
			<StatsMainCardEntry
				Icon={CircleSlash2}
				name="Spawn Ratio"
				value={formatPercentage((data.pokemon_ratio ?? 0) / 100)}
			/>
			<StatsMainCardEntry
				Icon={VectorSquare}
				name={/* @wc-context: Surface area */ "Area"}
				value={/* @wc-include */ `${formatNumber(data.m2, { maximumFractionDigits: 0 })}m²`}
			/>
			<UpdatedTimes updated={data.updated ?? undefined} />
			<QuickSearchButton
				class="mt-0!"
				label="Find wild {mPokemon(data)}"
				onclick={() =>
					setActiveSearchPokemon({ pokemon_id: data.pokemon_id ?? 0, form: data.form ?? 0 })}
			/>
		</StatsMainCard>
	</TitledMainSection>

	<PokemonStatsCard data={{ pokemon_id: data.pokemon_id ?? 0, form: data.form ?? 0 }} />

	<TitledMainSection Icon={CircleDot} title="View the Nest">
		<AccessPolygonMap
			polygon={data.polygon}
			fillColor="rgba(152, 248, 163, 0.4)"
			strokeColor="rgba(152, 248, 163, 0.8)"
		/>
	</TitledMainSection>
{/snippet}
