<script module lang="ts">
	import type { MapObjectPopupProps } from "@/components/ui/popups2/common/PopupBase.svelte";
	import * as m from "$lib/paraglide/messages";
	import { mPokemon } from "$lib/services/ingameLocale";
	import type { MapData } from "$lib/mapObjects/mapObjectTypes";
	import {
		Apple,
		BicepsFlexed,
		ChartColumn,
		ChartSpline,
		ChevronDown,
		CircleDot,
		CircleSmall,
		Clock,
		Copy,
		Crown,
		Flower,
		HatGlasses,
		Info,
		Mars,
		Navigation,
		Ruler,
		Search,
		Share2,
		Sparkles,
		SquareChartGantt,
		Sword,
		Swords,
		Venus,
		X
	} from "lucide-svelte";

	export { image, overview, main };

	export function getPopupPropsPokemon(data: MapData) {
		data = data as PokemonData;
		return {
			type: m.wild_pokemon(),
			title: pokemonName(data),
			image,
			overview,
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
</script>

<script lang="ts">
	import { Drawer } from "diadem-vaul-svelte";
	import { getMapObjects } from "$lib/mapObjects/mapObjectsState.svelte";
	import {
		getCurrentSelectedData,
		getCurrentSelectedMapId
	} from "$lib/mapObjects/currentSelectedState.svelte";
	import { useMetadata } from "$lib/ui/metadata.svelte";
	import { getIconItem, getIconPokemon } from "$lib/services/uicons.svelte";
	import PopupButtons from "@/components/ui/popups/common/PopupButtons.svelte";
	import {
		backupShareUrl,
		canNativeShare,
		copyToClipboard,
		hasClipboardWrite
	} from "$lib/utils/device";
	import Button from "@/components/ui/input/Button.svelte";

	import { getRootOrigin } from "$lib/native/runtime";
	import { getCurrentPath } from "$lib/mapObjects/interact";
	import { getLocale } from "$lib/paraglide/runtime";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import { mItem, mMove, mWeather } from "$lib/services/ingameLocale";
	import QuestIcon from "@/components/icons/QuestIcon.svelte";
	import InvasionIcon from "@/components/icons/InvasionIcon.svelte";
	import {
		getPokemonStats as getMasterPokemonStats,
		type PokemonStats
	} from "$lib/features/masterStats.svelte";
	import { getUserSettings } from "$lib/services/userSettings.svelte";
	import Countdown from "@/components/utils/Countdown.svelte";
	import type { PokemonData } from "$lib/types/mapObjectData/pokemon";
	import { isPointInAllowedArea } from "$lib/services/user/checkPerm";
	import { getUserDetails } from "$lib/services/user/userDetails.svelte";
	import { Features } from "$lib/utils/features";
	import type { FilterPokemon } from "$lib/features/filters/filters";
	import { POKEMON_MIN_RANK, RANGE_POKEMON } from "$lib/constants";
	import {
		formatDecimal,
		formatNumber,
		formatNumberCompact,
		formatPercentage,
		formatRatio
	} from "$lib/utils/numberFormat";
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
	import { Meter } from "bits-ui";
	import { slide, fly } from "svelte/transition";
	import { getLoadingProgress } from "$lib/services/initialLoad.svelte";
	import PartlyCloudy from "@/components/icons/weather/PartlyCloudy.svelte";
	import { resize } from "$lib/services/assets";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import { getMapsUrl } from "$lib/utils/mapUrl";
	import { Coords } from "$lib/utils/coordinates";
	import { getShareTitle } from "$lib/features/shareTexts";
	import PopupButton from "@/components/ui/popups/common/PopupButton.svelte";
	import TimeWithCountdown from "@/components/ui/popups/common/TimeWithCountdown.svelte";
	import SimpleOverviewCard from "@/components/ui/popups2/common/SimpleOverviewCard.svelte";
	import BasicMainCard from "@/components/ui/popups2/common/BasicMainCard.svelte";
	import { ArrowLeftRight, Expand, RulerDimensionLine, Shrink } from "lucide-svelte";
	import TitledMainSection from "@/components/ui/popups2/common/TitledMainSection.svelte";
	import StatsMainCard from "@/components/ui/popups2/common/StatsMainCard.svelte";
	import StatsMainCardEntry from "@/components/ui/popups2/common/StatsMainCardEntry.svelte";
	import IvBreakdown from "@/components/ui/popups2/pokemon/IvBreakdown.svelte";
	import UpdatedTimes from "@/components/ui/popups2/common/UpdatedTimes.svelte";
	import MainAccessMap from "@/components/ui/popups2/common/MainAccessMap.svelte";
	import { MapObjectType } from "$lib/mapObjects/mapObjectTypes";
	import { getWeatherIcon } from "$lib/utils/weatherIcons";

	let data: PokemonData = $derived(
		(getMapObjects()[getCurrentSelectedMapId()] as PokemonData) ??
		(getCurrentSelectedData() as PokemonData)
	);
	useMetadata(() => ({ title: data ? mPokemon(data) : undefined }));

	const snapPoints = ["250px", 1];
	let activeSnapPoint: number | string = $state(snapPoints[0]);

	function getMaxPvpRank(
		filterAttribute: "pvpRankLittle" | "pvpRankGreat" | "pvpRankUltra",
		filter: FilterPokemon
	) {
		const ranks = [POKEMON_MIN_RANK];
		const filters = filter.filters.filter((f) => f.enabled);
		for (const filter of filters) {
			if (filter[filterAttribute]) {
				ranks.push(filter[filterAttribute].max);
			}
		}
		return Math.max(...ranks);
	}

	let maxLittleRank = $derived(getMaxPvpRank("pvpRankLittle", getUserSettings().filters.pokemon));
	let maxGreatRank = $derived(getMaxPvpRank("pvpRankGreat", getUserSettings().filters.pokemon));
	let maxUltraRank = $derived(getMaxPvpRank("pvpRankUltra", getUserSettings().filters.pokemon));

	function getShareUrl() {
		return getRootOrigin() + getCurrentPath() + "?lang=" + getLocale();
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
			<BasicMainCard class="flex gap-2 font-medium items-center justify-center">
				<RulerDimensionLine class="size-4" />
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
								<IvBreakdown name={m.attack()} value={data.atk_iv} />
								<IvBreakdown name={m.defense()} value={data.def_iv} />
								<IvBreakdown name={m.stamina()} value={data.sta_iv} />
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
				<StatsMainCardEntry
					name={m.weather_boost()}
				>
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
							{m.unvailable()}
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
					onclick={() => mapExpandedRadius = !mapExpandedRadius}
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
