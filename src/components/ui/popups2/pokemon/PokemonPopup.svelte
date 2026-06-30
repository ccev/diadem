<script module lang="ts">
	import type { MapObjectPopupProps } from "@/components/ui/popups2/common/PopupBaseDrawer.svelte";
	import * as m from "$lib/paraglide/messages";
	import { mItem, mMove, mPokemon, mWeather } from "$lib/services/ingameLocale";
	import type { MapData } from "$lib/mapObjects/mapObjectTypes";
	import { MapObjectType } from "$lib/mapObjects/mapObjectTypes";
	import Button from "@/components/ui/input/Button.svelte";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import Countdown from "@/components/utils/Countdown.svelte";
	import BasicMainCard from "@/components/ui/popups2/common/BasicMainCard.svelte";
	import SimpleOverviewCard from "@/components/ui/popups2/common/SimpleOverviewCard.svelte";
	import TitledMainSection from "@/components/ui/popups2/common/TitledMainSection.svelte";
	import StatsMainCard from "@/components/ui/popups2/common/StatsMainCard.svelte";
	import StatsMainCardEntry from "@/components/ui/popups2/common/StatsMainCardEntry.svelte";
	import IvBreakdown from "@/components/ui/popups2/pokemon/IvBreakdown.svelte";
	import UpdatedTimes from "@/components/ui/popups2/common/UpdatedTimes.svelte";
	import MainAccessMap from "@/components/ui/popups2/common/MainAccessMap.svelte";
	import { getIconItem, getIconPokemon } from "$lib/services/uicons.svelte";
	import { getPokemonStats as getMasterPokemonStats, type PokemonStats } from "$lib/features/masterStats.svelte";
	import type { PokemonData } from "$lib/types/mapObjectData/pokemon";
	import { isPointInAllowedArea } from "$lib/services/user/checkPerm";
	import { getUserDetails } from "$lib/services/user/userDetails.svelte";
	import { Features } from "$lib/utils/features";
	import { formatNumber, formatNumberCompact, formatPercentage, formatRatio } from "$lib/utils/numberFormat";
	import {
		getBestRank,
		getPokemonSize,
		getRarityLabel,
		hasTimer,
		League,
		showGreat,
		showLittle,
		showUltra
	} from "$lib/utils/pokemonUtils";
	import { slide } from "svelte/transition";
	import { resize } from "$lib/services/assets";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import { getWeatherIcon } from "$lib/utils/weatherIcons";
	import { getUserSettings } from "$lib/services/userSettings.svelte";
	import { matchPokemonFiltersets } from "$lib/features/filterLogic/pokemon";
	import { filterTitle } from "$lib/features/filters/filtersetUtils.svelte";
	import {
		ArrowLeftRight,
		BicepsFlexed,
		ChartColumn,
		ChevronDown,
		CircleDot,
		CircleSmall,
		Clock,
		Crown,
		Expand,
		Info,
		Mars,
		Ruler,
		RulerDimensionLine,
		Shrink,
		SlidersHorizontal,
		Sparkles,
		Spotlight,
		SquareChartGantt,
		Swords,
		Trash2,
		Venus
	} from "lucide-svelte";
	import FiltersetIcon from "$lib/features/filters/FiltersetIcon.svelte";

	// @ts-expect-error Svelte snippets are declared below and exported at compile time.
	export { image, overview, main };

	export function getPopupPropsPokemon(data: MapData) {
		data = data as PokemonData;
		return {
			type: m.wild_pokemon(),
			title: pokemonName(data),
			// @ts-expect-error Svelte snippets are declared below and available at compile time.
			image,
			// @ts-expect-error Svelte snippets are declared below and available at compile time.
			overview,
			// @ts-expect-error Svelte snippets are declared below and available at compile time.
			main
		} as MapObjectPopupProps;
	}

	let showIvBreakdown: boolean = $state(false);
	let mapExpandedRadius: boolean = $state(false);

	function pokemonName(data: Partial<PokemonData>) {
		return mPokemon(data);
	}

	function speciesName(data: PokemonData) {
		return mPokemon({ pokemon_id: data.pokemon_id });
	}

	function canSeeIv(data: PokemonData) {
		return (
			data &&
			isPointInAllowedArea(getUserDetails().permissions, Features.POKEMON_IV, data.lat, data.lon)
		);
	}

	function getPvpNotice(data: PokemonData) {
		const leagues = [
			{ league: m.little_league(), rank: getBestRank(data, League.LITTLE) },
			{ league: m.great_league(), rank: getBestRank(data, League.GREAT) },
			{ league: m.ultra_league(), rank: getBestRank(data, League.ULTRA) }
		]
			.filter(({ rank }) => rank > 0 && rank <= 5)
			.map(({ league }) => league)

		if (leagues.length === 0) return undefined
		if (leagues.length === 1) return leagues[0]

		return m.listed_and({
			part1: leagues.slice(0, leagues.length - 1).join(", "),
			part2: leagues[leagues.length - 1]
		})

	}
</script>

{#snippet image(d: MapData)}
	{@const data = d as PokemonData}
	<div class="size-14 shrink-0">
		<ImagePopup alt={mPokemon(data)} src={getIconPokemon(data)} class="size-14" />
	</div>
{/snippet}

{#snippet overview(d: MapData)}
	{@const data = d as PokemonData}

	<SimpleOverviewCard title={hasTimer(data) ? m.popup_despawns() : m.popup_found()}>
		<Countdown expireTime={hasTimer(data) ? data.expire_timestamp : data.first_seen_timestamp} />
	</SimpleOverviewCard>

	{#if data.iv != null}
		<SimpleOverviewCard title={m.pogo_ivs()}>
			{@render coloredIvs(data.iv, 1)}
		</SimpleOverviewCard>
	{/if}

	{#if showLittle(data)}
		<SimpleOverviewCard title={m.little_league()}>
			#{getBestRank(data, League.LITTLE)}
		</SimpleOverviewCard>
	{/if}

	{#if showGreat(data)}
		<SimpleOverviewCard title={m.great_league()}>
			#{getBestRank(data, League.GREAT)}
		</SimpleOverviewCard>
	{/if}

	{#if showUltra(data)}
		<SimpleOverviewCard title={m.ultra_league()}>
			#{getBestRank(data, League.ULTRA)}
		</SimpleOverviewCard>
	{/if}

	{#if data.size && [1, 5].includes(data.size)}
		<SimpleOverviewCard title={m.pokemon_size()}>
			{getPokemonSize(data.size)}
		</SimpleOverviewCard>
	{/if}

	{#if data.cp != null}
		<SimpleOverviewCard title={m.cp()}>
			{data.cp}
		</SimpleOverviewCard>
	{/if}

	{#if data.level != null}
		<SimpleOverviewCard title={m.level()}>
			{data.level}
		</SimpleOverviewCard>
	{/if}
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as PokemonData}
	{@const stats: PokemonStats | undefined = getMasterPokemonStats(data.pokemon_id, data.form ?? 0)}
	{@const statsEntry = stats?.entry}
	{@const WeatherIcon = getWeatherIcon(data.weather)}
	{@const pvpNotice = getPvpNotice(data)}

	<!-- Disappear Time-->
	<BasicMainCard>
		<p class="font-semibold ml-1">
			{#if hasTimer(data)}
				{m.disappear_time()}
			{:else}
				{m.first_seen()}
			{/if}
		</p>

		<div class="flex justify-between text-xl mt-3 items-center gap-4">
			<div
				class="justify-center font-semibold flex gap-2 items-center rounded-md bg-neutral-800 pl-4 pr-6 py-2 w-full"
			>
				<Clock class="size-4" />
				<p>
					{timestampToLocalTime(
						hasTimer(data) ? data.expire_timestamp : data.first_seen_timestamp,
						false,
						true
					)}
				</p>
			</div>

			<div
				class="justify-center font-semibold flex gap-2 items-center rounded-md bg-neutral-800 pl-4 pr-6 py-2 w-full"
			>
				<Countdown
					expireTime={hasTimer(data) ? data.expire_timestamp : data.first_seen_timestamp}
				/>
			</div>
		</div>

		{#if !hasTimer(data)}
			<p class="text-muted-foreground mt-4 text-sm px-1">
				{#if data.seen_type?.includes("nearby")}
					{m.unknown_spawnpoint_notice_nearby()}
				{:else}
					{m.unknown_spawnpoint_notice()}
				{/if}
			</p>
		{/if}
	</BasicMainCard>

	<div class="space-y-2">
		<!--Special seen types-->
		{#if data.seen_type?.includes("lure")}
			<BasicMainCard class="flex gap-4 font-medium items-center justify-center">
				<img class="w-8 shrink-0" src={resize(getIconItem(501), { width: 64 })} alt={mItem(501)} />
				{m.notice_lure({ name: speciesName(data) })}
			</BasicMainCard>
		{:else if data.seen_type?.includes("tappable")}
			<BasicMainCard class="flex gap-4 font-medium items-center justify-center">
				<img
					class="w-8 shrink-0"
					src={resize(getIconItem(1151), { width: 64 })}
					alt={mItem(1151)}
				/>
				{m.notice_tappable({ name: speciesName(data) })}
			</BasicMainCard>
		{:else if data.seen_type?.includes("nearby")}
			<BasicMainCard class="text-center">
				{m.notice_nearby({ name: speciesName(data) })}
			</BasicMainCard>
		{/if}

		<!--No IVs-->
		{#if !data.seen_type?.includes("nearby") && !data.iv && data.iv !== 0 && canSeeIv(data)}
			<BasicMainCard class="text-center">
				{m.notice_wild({ name: speciesName(data) })}
			</BasicMainCard>
		{/if}

		<!--XXL/XXS notice-->
		{#if data.size && [1, 5].includes(data.size)}
			<BasicMainCard class="flex gap-2 font-medium justify-center">
				<RulerDimensionLine class="size-4 mt-1" />
				{#if data.size === 1}
					{m.notice_xxs({ name: speciesName(data) })}
				{:else if data.size === 5}
					{m.notice_xxl({ name: speciesName(data) })}
				{/if}
			</BasicMainCard>
		{/if}

		<!--Mighty-->
		{#if data.strong}
			<BasicMainCard class="flex gap-2 justify-center">
				<BicepsFlexed class="size-4 mt-0.5" />
				{m.notice_mighty()}
			</BasicMainCard>
		{/if}

		<!--IV notices-->
		{#if data.iv != null && data.iv > 99}
			<BasicMainCard class="flex gap-2 font-medium justify-center">
				<span>
					💯
				</span>
				{m.notice_hundo({ name: speciesName(data) })}
			</BasicMainCard>
		{:else if data.iv === 0}
			<BasicMainCard class="flex gap-2 font-medium justify-center">
				<Trash2 class="size-4 mt-1" />
				{m.notice_nundo({ name: speciesName(data) })}
			</BasicMainCard>
		{/if}

		<!--Rarity notice-->
		{#if stats && statsEntry && statsEntry.spawns && statsEntry.spawns.count / stats.total.count <= 0.000001}
			<BasicMainCard class="flex gap-2 font-medium justify-center">
				<Spotlight class="size-4 mt-1" />
				{m.notice_extremely_rare({
					name: speciesName(data),
					chance: formatNumber(stats.total.count / statsEntry.spawns.count, { maximumFractionDigits: 0 })
				})}
			</BasicMainCard>
		{/if}

		<!--PVP rank notices-->
		{#if pvpNotice}
			<BasicMainCard class="flex gap-2 font-medium justify-center">
				<Swords class="size-4 mt-1" />
				{m.notice_pvp_rank({
					name: speciesName(data),
					league: pvpNotice
				})}
			</BasicMainCard>
		{/if}

		<!--Ditto-->
		{#if data.display_pokemon_id}
			{@const displayPokemon = {
				pokemon_id: data.display_pokemon_id,
				form: data.display_pokemon_form
			}}
			<BasicMainCard class="flex gap-4 font-medium items-center justify-center">
				<ImagePopup
					class="size-10 shrink-0"
					src={getIconPokemon(displayPokemon)}
					alt={mPokemon(displayPokemon)}
				/>
				{m.notice_disguise({
					name1: pokemonName(data),
					name2: pokemonName(displayPokemon)
				})}
			</BasicMainCard>
		{/if}

		{#if Math.abs((data.changed ?? 0) - (data.updated ?? data.changed ?? 0)) > 10}
			<BasicMainCard class="flex gap-2 items-center justify-center">
				<ArrowLeftRight class="size-4" />
				{m.popup_species_changed()}
			</BasicMainCard>
		{/if}
	</div>

	{#if data.iv != null || data.cp != null || data.level != null}
		<TitledMainSection Icon={SquareChartGantt} title={m.values()}>
			<StatsMainCard>
				{#if data.iv != null}
					<div>
						<Button
							variant=""
							size=""
							class="flex text-base! font-normal! justify-between! w-full"
							onclick={() => (showIvBreakdown = !showIvBreakdown)}
						>
							<p class="text-muted-foreground">
								{m.iv_product_label_long()}
							</p>
							<div class="flex items-center">
								<ChevronDown
									class="size-3.5 mr-2 text-muted-foreground transition-transform"
									style="rotate: {showIvBreakdown ? '180deg' : '0deg'}"
								/>
								{@render coloredIvs(data.iv, 2)}
							</div>
						</Button>
						{#if showIvBreakdown}
							<div class="mt-4 mb-5 space-y-1" transition:slide={{ duration: 110 }}>
								<IvBreakdown name={m.attack()} value={data.atk_iv ?? 0} />
								<IvBreakdown name={m.defense()} value={data.def_iv ?? 0} />
								<IvBreakdown name={m.stamina()} value={data.sta_iv ?? 0} />
							</div>
						{/if}
					</div>
				{/if}

				{#if data.cp}
					<StatsMainCardEntry name={m.cp()} value={data.cp} />
				{/if}
				{#if data.level}
					<StatsMainCardEntry name={m.level()} value={data.level} />
				{/if}
				<StatsMainCardEntry name={m.weather_boost()}>
					{#snippet value()}
						{#if data.weather}
							<div class="flex items-center gap-1.5">
								<WeatherIcon class="size-4" />
								{mWeather(data.weather)}
							</div>
						{:else}
							{m.modifier_none()}
						{/if}
					{/snippet}
				</StatsMainCardEntry>
			</StatsMainCard>
		</TitledMainSection>
	{/if}

	<!--Shiny / Rarity-->
	<TitledMainSection Icon={ChartColumn} title={m.stats()}>
		{#snippet rightPart()}
			<p class="text-sm text-muted-foreground">
				{#if stats}
					{m.last_x_days({ days: formatNumber(stats.total.days) })} ·
				{/if}
				{#if statsEntry}
					{m.total_seen()}: {formatNumberCompact(
					statsEntry?.shiny?.total ?? statsEntry?.spawns?.count
				)}
				{/if}
			</p>
		{/snippet}

		<StatsMainCard>
			{#if !statsEntry}
				{m.stats_unavailable({ name: speciesName(data) })}
			{:else}
				<StatsMainCardEntry
					Icon={Sparkles}
					name={statsEntry.shiny && statsEntry.shiny.shinies > 0
						? m.shiny_rate()
						: m.contest_shiny()}
					value={statsEntry.shiny && statsEntry.shiny.shinies > 0
						? formatRatio(statsEntry.shiny.shinies, statsEntry.shiny.total)
						: m.no_shinies_seen()}
				/>
				<StatsMainCardEntry Icon={Crown} name={m.rarity()}>
					{#snippet value()}
						{#if statsEntry.spawns && statsEntry.spawns.count > 0}
							<p class="flex gap-2">
								<span class="text-muted-foreground">
									{formatRatio(statsEntry.spawns.count, stats.total.count)}
								</span>
								<span class="text-muted-foreground">·</span>
								<span>{getRarityLabel(statsEntry.spawns.count, stats.total.count)}</span>
							</p>
						{:else}
							{m.unavailable()}
						{/if}
					{/snippet}
				</StatsMainCardEntry>
			{/if}
		</StatsMainCard>
	</TitledMainSection>

	{#if !data.seen_type?.includes("nearby")}
		<TitledMainSection Icon={CircleDot} title={m.access_this_pokemon({ name: speciesName(data) })}>
			<div class="relative">
				<MainAccessMap
					lat={data.lat}
					lon={data.lon}
					type={MapObjectType.POKEMON}
					uiconType="pokemon"
					radius={mapExpandedRadius ? 80 : 40}
					zoom={mapExpandedRadius ? 15.5 : 16.5}
					icon={resize(getIconPokemon(data), { width: 64 })}
				/>
				<Button
					variant="outline"
					size="sm"
					class="mt-2 absolute top-3 right-3 bg-accent! hover:bg-background! active:bg-background!"
					onclick={() => (mapExpandedRadius = !mapExpandedRadius)}
				>
					{#if mapExpandedRadius}
						<Shrink class="size-3.5" />
						{m.normal()}
					{:else}
						<Expand class="size-3.5" />
						{m.popup_action_spacial_rend()}
					{/if}
				</Button>
			</div>
		</TitledMainSection>
	{/if}

	{#if getUserSettings().filters.pokemon.enabled && getUserSettings().filters.pokemon.filters.find(f => f.enabled)}
		<TitledMainSection Icon={SlidersHorizontal} title={m.matching_filtersets()}>
			<BasicMainCard>
				{@const filtersets = matchPokemonFiltersets(data)}

				{#if filtersets.length === 0}
					<p>
						{m.filters_dont_match_pokemon()}
					</p>
				{/if}
				<div class="flex flex-wrap gap-3">
					{#each filtersets as filterset}
						<div class="flex gap-3 font-medium items-center bg-accent-highlight px-4 py-2 rounded-md">
							<FiltersetIcon {filterset} size={4} />
							{filterTitle(filterset)}
						</div>
					{/each}
				</div>

			</BasicMainCard>
		</TitledMainSection>
	{/if}

	<TitledMainSection Icon={Info} title={m.about_this_pokemon({ name: speciesName(data) })}>
		<StatsMainCard>
			<StatsMainCardEntry
				Icon={data.gender === 1 ? Mars : data.gender === 2 ? Venus : CircleSmall}
				name={m.pokemon_gender()}
			>
				{#snippet value()}
					{#if data.gender != null}
						{#if data.gender === 1}
							{m.pokemon_gender_male()}
						{:else if data.gender === 2}
							{m.pokemon_gender_female()}
						{:else}
							{m.pokemon_gender_neutral()}
						{/if}
					{:else}
						<span class="text-muted-foreground">
							{m.unknown()}
						</span>
					{/if}
				{/snippet}
			</StatsMainCardEntry>
			<StatsMainCardEntry
				Icon={Ruler}
				name={m.pokemon_size()}
				value={data.size != null ? getPokemonSize(data.size) : m.unknown()}
			/>
			<StatsMainCardEntry Icon={Swords} name={m.popup_pokemon_moves()}>
				{#snippet value()}
					<p class="flex gap-2">
						{#if data.move_1 && data.move_2}
							<span>{mMove(data.move_1)}</span>
							<span>·</span>
							<span>{mMove(data.move_2)}</span>
						{:else}
							{m.unknown()}
						{/if}
					</p>
				{/snippet}
			</StatsMainCardEntry>

			<UpdatedTimes
				firstSeen={data.first_seen_timestamp}
				updated={Math.abs((data?.first_seen_timestamp ?? 0) - (data?.updated ?? 0)) > 5
					? data.updated
					: undefined}
			/>
		</StatsMainCard>
	</TitledMainSection>
{/snippet}

{#snippet coloredIvs(iv: number, decimals: number)}
	<span
		class:text-tier-0={iv <= 50}
		class:text-tier-1={iv > 50 && iv <= 75}
		class:text-tier-2={iv > 75 && iv < 90}
		class:text-tier-3={iv >= 90 && iv <= 99}
		class:text-tier-4={iv > 99}
	>
		{formatPercentage(iv / 100, { minDecimals: decimals, maxDecimals: decimals })}
	</span>
{/snippet}
