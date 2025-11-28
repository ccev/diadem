<script lang="ts">
	import type { PokemonData } from '@/lib/types/mapObjectData/pokemon';
	import Countdown from '@/components/utils/Countdown.svelte';
	import { getWeatherIcon } from '@/lib/utils/weatherIcons.js';
	import BasePopup from '@/components/ui/popups/BasePopup.svelte';
	import ImagePopup from '@/components/ui/popups/common/ImagePopup.svelte';
	import { getIconPokemon } from '@/lib/services/uicons.svelte.js';
	import {
		ArrowLeftRight,
		BicepsFlexed,
		ChartSpline,
		CircleSmall,
		Clock,
		ClockAlert,
		Crown,
		LibraryBig,
		MapPinX,
		Mars,
		Ruler,
		Search,
		SearchCheck,
		SearchX,
		Sparkles,
		Swords,
		Trophy,
		Venus
	} from 'lucide-svelte';
	import IconValue from '@/components/ui/popups/common/IconValue.svelte';
	import * as m from '@/lib/paraglide/messages';
	import { mMove, mPokemon, mWeather } from '@/lib/services/ingameLocale';
	import TimeWithCountdown from '@/components/ui/popups/common/TimeWithCountdown.svelte';
	import { getMapObjects } from '@/lib/mapObjects/mapObjectsState.svelte.js';
	import { POKEMON_MIN_RANK } from '@/lib/constants';
	import PvpEntry from '@/components/ui/popups/pokemon/PvpEntry.svelte';
	import { getCurrentSelectedData } from '@/lib/mapObjects/currentSelectedState.svelte';
	import {
		getPokemonSize,
		getRank,
		getRarityLabel,
		hasTimer,
		showGreat,
		showLittle,
		showUltra
	} from '@/lib/utils/pokemonUtils';
	import Metadata from '@/components/utils/Metadata.svelte';
	import { getPokemonStats as getMasterPokemonStats, type PokemonStats } from '@/lib/features/masterStats.svelte';
	import Button from '@/components/ui/input/Button.svelte';
	import { formatNumber, formatNumberCompact, formatRatio } from '@/lib/utils/numberFormat';

	let { mapId }: { mapId: string } = $props();
	let data: PokemonData = $derived(getMapObjects()[mapId] as PokemonData ?? getCurrentSelectedData() as PokemonData);

	// let masterPokemon: MasterPokemon | undefined = $derived(getMasterPokemon(data.pokemon_id))

	let stats: PokemonStats | undefined = $derived(getMasterPokemonStats(data.pokemon_id, data.form ?? 0));

	</script>

<svelte:head>
	<Metadata title={mPokemon(data)} />
</svelte:head>

{#snippet timer()}
	<IconValue Icon={hasTimer(data) ? Clock : ClockAlert}>
		<span>
			{#if hasTimer(data)}
				{m.popup_despawns()}
			{:else}
				{m.popup_found()}
			{/if}
		</span>

		<TimeWithCountdown
			expireTime={hasTimer(data) ? data.expire_timestamp : data.first_seen_timestamp}
		/>
	</IconValue>
{/snippet}

{#snippet basicInfo()}
	{@render timer()}

	{#if Math.abs(data.changed - (data.updated ?? data.changed)) > 10}
		<IconValue Icon={ArrowLeftRight}>
			{m.popup_species_changed()}
		</IconValue>
	{/if}

	{#if data.seen_type?.includes("nearby")}
		<IconValue Icon={MapPinX}>
			{m.popup_estimated_location()}
		</IconValue>
	{/if}

	{#if data.iv === null}
		<IconValue Icon={SearchX}>
			{m.popup_no_iv_scanned()}
		</IconValue>
	{/if}

	{#if data.cp !== null || data.level !== null}
		<IconValue Icon={ChartSpline}>
			{#if data.cp !== null}
				<span class="font-semibold">
					{m.pogo_cp({ cp: data.cp })}
				</span>
			{/if}
			{#if data.level !== null}
				({m.pogo_level({ level: data.level })})
			{/if}
		</IconValue>
	{/if}

	{#if data.iv !== null}
		<IconValue Icon={LibraryBig}>
			{m.pogo_ivs()}: <b>{data.iv.toFixed(1)}%</b>
			({data.atk_iv ?? "?"}/{data.def_iv ?? "?"}/{data.sta_iv ?? "?"})
		</IconValue>
	{/if}


	{#if showLittle(data)}
		<IconValue Icon={Trophy}>
			{m.league_rank({ league: m.little_league() })}:
			<b>#{getRank(data, "little")}</b>
		</IconValue>
	{/if}

	{#if showGreat(data)}
		<IconValue Icon={Trophy}>
			{m.league_rank({ league: m.great_league() })}:
			<b>#{getRank(data, "great")}</b>
		</IconValue>
	{/if}

	{#if showUltra(data)}
		<IconValue Icon={Trophy}>
			{m.league_rank({ league: m.ultra_league() })}:
			<b>#{getRank(data, "ultra")}</b>
		</IconValue>
	{/if}
{/snippet}

<BasePopup lat={data.lat} lon={data.lon}>
	{#snippet image()}
		<div class="w-12 shrink-0">
			<ImagePopup
				alt={data.pokemon_id.toString()}
				src={getIconPokemon(data)}
				class="w-12 h-12"
			/>
		</div>
	{/snippet}

	{#snippet title()}
		<div class="flex items-center gap-1.5 text-lg font-semibold tracking-tight -ml-0.5">
			{#if data.iv}
					<span
						class="rounded-xl px-2.5 py-1 text-sm"
						class:bg-rose-300={data.iv <= 50}
						class:bg-orange-300={data.iv > 50 && data.iv <= 75}
						class:bg-cyan-300={data.iv > 75 && data.iv < 90}
						class:bg-teal-300={data.iv >= 90 && data.iv <= 99}
						class:bg-green-300={data.iv > 99}
					>
						{data.iv?.toFixed(1)}%
					</span>
			{/if}
			<span>
				{mPokemon(data)}
				{#if data.display_pokemon_id}
					({mPokemon({ pokemon_id: data.display_pokemon_id })})
				{/if}
			</span>
		</div>
	{/snippet}

	{#snippet description()}
		{@render basicInfo()}
	{/snippet}

	{#snippet content()}
		{#if stats && stats.entry}
			{@const entry = stats.entry}
			<div class="rounded-sm bg-accent text-accent-foreground border border-border px-4 -mx-4 pt-3 pb-3.5 mb-2 mt-3">
				<p class="text-xs mb-2">
					{m.stats()}
					· {m.last_x_days({ days: formatNumber(stats.total.days) })}
					· {m.total_seen()}: {formatNumberCompact(entry?.shiny?.total ?? entry?.spawns?.count)}
<!--					·-->
<!--					<Button variant="link" size="sm" class="p-0! m-0! h-fit! text-xs! underline">-->
<!--						See more-->
<!--					</Button>-->
				</p>
				{#if entry.shiny && entry.shiny.shinies > 0}
					<IconValue Icon={Sparkles}>
						{m.shiny_rate()}:
						<b>
							{formatRatio(entry.shiny.shinies, entry.shiny.total)}
						</b>
					</IconValue>
				{:else}
					<IconValue Icon={Sparkles}>
						{m.no_shiny()}
					</IconValue>
				{/if}
				{#if entry.spawns && entry.spawns.count > 0}
					<IconValue Icon={Crown}>
						{m.rarity()}:
						<b>
							{getRarityLabel(entry.spawns.count, stats.total.count)}
						</b>
						<span>
							({formatRatio(entry.spawns.count, stats.total.count)})
						</span>
					</IconValue>
				{/if}
			</div>
		{/if}

		<div class="mb-3">
			{@render basicInfo()}
		</div>

		<!-- TODO: shiny rates. i don't fully know how to best do this -->
		<!--{@const cachedShinyRate = getCachedShinyRate(data.pokemon_id, data.form ?? 0)}-->
		<!--{#if cachedShinyRate}-->
		<!--	<IconValue Icon={Sparkles}>-->
		<!--		{m.shiny_rate()}:-->
		<!--		<b>-->
		<!--			1:{(cachedShinyRate.total / cachedShinyRate.shinies).toFixed(1)}-->
		<!--		</b>-->
		<!--	</IconValue>-->
		<!--{:else if cachedShinyRate === false}-->
		<!--	{#await getShinyRate(data.pokemon_id, data.form ?? 0) then rate}-->
		<!--		{#if rate}-->
		<!--			<IconValue Icon={Sparkles}>-->
		<!--				{m.shiny_rate()}:-->
		<!--				<b>-->
		<!--					1:{(rate.total / rate.shinies).toFixed(1)}-->
		<!--				</b>-->
		<!--			</IconValue>-->
		<!--		{/if}-->
		<!--	{/await}-->
		<!--{/if}-->


		<!--{shinyRate}-->
		<!--{#if shinyRate}-->
		<!--	<IconValue Icon={Sparkles}>-->
		<!--		{m.shiny_rate()}:-->
		<!--		<b>-->
		<!--			1:{(shinyRate.total / shinyRate.shinies).toFixed(1)}-->
		<!--		</b>-->
		<!--	</IconValue>-->
		<!--{/if}-->

		{#if showLittle(data) || showGreat(data) || showUltra(data)}
			PVP Rankings:
			<div class="mb-3 space-y-1">
				{#each (data.pvp?.little ?? []) as entry (entry.rank)}
					{#if (entry.rank ?? 100000) <= POKEMON_MIN_RANK}
						<PvpEntry data={entry} league="little" />
					{/if}
				{/each}
				{#each data.pvp?.great ?? [] as entry (entry.rank)}
					{#if (entry.rank ?? 100000) <= POKEMON_MIN_RANK}
						<PvpEntry data={entry} league="great" />
					{/if}
				{/each}
				{#each (data.pvp?.ultra ?? []) as entry (entry.rank)}
					{#if (entry.rank ?? 100000) <= POKEMON_MIN_RANK}
						<PvpEntry data={entry} league="ultra" />
					{/if}
				{/each}
			</div>
		{/if}

		{#if data.strong}
			<IconValue Icon={BicepsFlexed}>
				{m.popup_pokemon_is_strong()}
			</IconValue>
		{/if}

		<IconValue
			Icon={getWeatherIcon(data.weather)}
		>
			{#if data.weather}
				{m.weather_boost()}:
				<b>{mWeather(data.weather)}</b>
			{:else}
				{m.no_weather_boost()}
			{/if}
		</IconValue>

		{#if data.gender !== null}
			{#if data.gender === 1}
				<IconValue Icon={Mars}>
					{m.pokemon_gender()}: <b>{m.pokemon_gender_male()}</b>
				</IconValue>
			{:else if data.gender === 2}
				<IconValue Icon={Venus}>
					{m.pokemon_gender()}: <b>{m.pokemon_gender_female()}</b>
				</IconValue>
			{:else}
				<IconValue Icon={CircleSmall}>
					{m.pokemon_gender()}: <b>{m.pokemon_gender_neutral()}</b>
				</IconValue>
			{/if}
		{/if}

		{#if data.size !== null}
			<IconValue Icon={Ruler}>
				<span>
					Size: <b>{getPokemonSize(data.size)}</b>
				</span>
			</IconValue>
		{/if}

		{#if data.move_1 && data.move_2}
			<IconValue Icon={Swords}>
				{m.popup_pokemon_moves()}:
				<b>{mMove(data.move_1)}</b>
				/
				<b>{mMove(data.move_2)}</b>
			</IconValue>
		{/if}

		<div class="h-3"></div>

		{#if data.first_seen_timestamp !== data.updated}
			<IconValue Icon={SearchCheck}>
				{m.last_seen()}: <b>
				<Countdown expireTime={data.updated} />
			</b>
			</IconValue>
		{/if}

		<IconValue Icon={Search}>
			{m.first_seen()}: <b>
			<Countdown expireTime={data.first_seen_timestamp} />
		</b>
		</IconValue>

	{/snippet}
</BasePopup>
