<script module lang="ts">
	import type { MapObjectPopupProps } from "@/components/ui/popups/common/PopupBaseStatic.svelte";
	import * as m from "$lib/paraglide/messages";
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
	import { CircleDot, CircleSlash2, Info, MapPinned, RotateCcw, Trees, VectorSquare } from "@lucide/svelte";
	import type { NestData } from "$lib/types/mapObjectData/nest";
	import AccessPolygonMap from "@/components/ui/popups/common/AccessPolygonMap.svelte";
	import QuickSearchButton from "@/components/ui/popups/common/QuickSearchButton.svelte";
	import { setActiveSearchPokemon } from "$lib/features/activeSearch.svelte";
	import PokemonStatsCard from "@/components/ui/popups/common/PokemonStatsCard.svelte";

	export { image, overview, main };

	export function getPopupPropsNest(data: MapData) {
		data = data as NestData;
		return {
			type: m.pogo_nest(),
			title: m.pokemon_nest({ pokemon: mPokemon(data) }),
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
		<OverviewCard Icon={Trees} title={m.park_name()} value={data.name} />
	{/if}

	<OverviewCard Icon={RotateCcw} title={m.nest_avg()}
	              value={m.nest_avg_value({ avg: formatDecimal(data.pokemon_avg) })} />
	<OverviewCard Icon={MapPinned} title={m.spawnpoints()} value={formatNumber(data.spawnpoints)} />
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as NestData}

	<TitledMainSection
		Icon={Info}
		title={m.about_this_nest()}
	>
		<StatsMainCard>
			<StatsMainCardEntry
				Icon={Trees}
				name={m.park_name()}
				value={data.name ? data.name : m.unknown()}
			/>
			<StatsMainCardEntry
				Icon={RotateCcw}
				name={m.nest_avg()}
				value={m.nest_avg_value({ avg: formatDecimal(data.pokemon_avg) })}
			/>
			<StatsMainCardEntry
				Icon={MapPinned}
				name={m.nest_spawnpoint_count()}
				value={formatNumber(data.spawnpoints)}
			/>
			<StatsMainCardEntry
				Icon={CircleSlash2}
				name={m.nest_ratio()}
				value={formatPercentage((data.pokemon_ratio ?? 0) / 100)}
			/>
			<StatsMainCardEntry
				Icon={VectorSquare}
				name={m.nest_size()}
				value={m.square_m_value({ size: formatNumber(data.m2, { maximumFractionDigits: 0 }) })}
			/>
			<UpdatedTimes
				updated={data.updated ?? undefined}
			/>
			<QuickSearchButton
				class="mt-0!"
				label={m.find_wild({ name: mPokemon(data) })}
				onclick={() => setActiveSearchPokemon({pokemon_id: data.pokemon_id ?? 0, form: data.form ?? 0})}
			/>
		</StatsMainCard>
	</TitledMainSection>

	<PokemonStatsCard data={{ pokemon_id: data.pokemon_id ?? 0, form: data.form ?? 0 }} />

	<TitledMainSection Icon={CircleDot} title={m.access_this_nest()}>
		<AccessPolygonMap
			polygon={data.polygon}
			fillColor="rgba(152, 248, 163, 0.4)"
			strokeColor="rgba(152, 248, 163, 0.8)"
		/>
	</TitledMainSection>
{/snippet}
