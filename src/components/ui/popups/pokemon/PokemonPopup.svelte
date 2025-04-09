<script lang="ts">
	import type { PokemonData } from '@/lib/types/mapObjectData/pokemon';
	import Countdown from '@/components/utils/Countdown.svelte';
	import { timestampToLocalTime } from '@/lib/utils.svelte.js';
	import BasePopup from '@/components/ui/popups/BasePopup.svelte';
	import ImagePopup from '@/components/ui/popups/common/ImagePopup.svelte';
	import { getIconPokemon } from '@/lib/uicons.svelte.js';
	import {
		Clock,
		ClockAlert,
		SearchX,
		MapPinX,
		DraftingCompass,
		ChartBar,
		Ruler,
		ClockArrowUp,
		Gift,
		ArrowLeftRight,
		Search,
		Swords,
		Mars,
		Venus,
		CircleSmall,
		Sun,
		Umbrella,
		CloudSun,
		Cloudy,
		Wind,
		Snowflake,
		Waves, CloudOff, BicepsFlexed, Percent, ChartNoAxesColumn, LibraryBig, ChartSpline, Trophy, SearchCheck
	} from 'lucide-svelte';
	import IconValue from '@/components/ui/popups/common/IconValue.svelte';
	import {getMasterPokemon, defaultProp} from '@/lib/masterfile';
	import type { MasterPokemon } from '@/lib/types/masterfile';
	import TextSeparator from '@/components/utils/TextSeparator.svelte';
	import * as m from "@/lib/paraglide/messages"
	import { getConfig } from '@/lib/config';
	import { ingame, pokemonName } from '@/lib/ingameLocale';
	import TimeWithCountdown from '@/components/ui/popups/common/TimeWithCountdown.svelte';
	import { getMapObjects } from '@/lib/mapObjects/mapObjectsState.svelte.js';
	import { getPokemonSize, isFortOutdated } from '@/lib/pogoUtils';
	import type { GymData } from '@/lib/types/mapObjectData/gym';
	import UpdatedTimes from '@/components/ui/popups/common/UpdatedTimes.svelte';
	import { POKEMON_MIN_RANK } from '@/lib/constants';
	import PvpEntry from '@/components/ui/popups/pokemon/PvpEntry.svelte';
	import { getCurrentSelectedData } from '@/lib/mapObjects/currentSelectedState.svelte';

	let { mapId } : { mapId: string } = $props()
	let data: PokemonData = $derived(getMapObjects()[mapId] as PokemonData ?? getCurrentSelectedData() as PokemonData)

	let masterPokemon: MasterPokemon | undefined = $derived(getMasterPokemon(data.pokemon_id))

	const weatherIcons = {
		1: Sun,
		2: Umbrella,
		3: CloudSun,
		4: Cloudy,
		5: Wind,
		6: Snowflake,
		7: Waves
	}

	function hasTimer() {
		return data.expire_timestamp && data.expire_timestamp_verified
	}

	function getTitle() {
		let title = getConfig().general.mapName
		if (masterPokemon) {
			title += " | " + masterPokemon.name
		} else {
			title += " | " + m.pogo_pokemon()
		}
		return title
	}

	function getRank(league: "little" | "great" | "ultra") {
		return data.pvp?.[league]?.[0]?.rank ?? 0
	}

	function showLittle() {
		return getRank("little") > 0 && getRank("little") <= POKEMON_MIN_RANK
	}

	function showGreat() {
		return getRank("great") > 0 && getRank("great") <= POKEMON_MIN_RANK
	}

	function showUltra() {
		return getRank("ultra") > 0 && getRank("ultra") <= POKEMON_MIN_RANK
	}
</script>

<svelte:head>
	<title>{getTitle()}</title>
</svelte:head>

{#snippet timer()}
	<IconValue Icon={hasTimer() ? Clock : ClockAlert}>
		<span>
			{#if hasTimer()}
				{m.popup_despawns()}
			{:else}
				{m.popup_found()}
			{/if}
		</span>

		<TimeWithCountdown
			expireTime={hasTimer() ? data.expire_timestamp : data.first_seen_timestamp}
		/>
	</IconValue>
{/snippet}

{#snippet basicInfo()}
	{@render timer()}

	{#if data.changed - data.first_seen_timestamp > 30}
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
					{m.pogo_cp({cp: data.cp})}
				</span>
			{/if}
			{#if data.level !== null}
				({m.pogo_level({level: data.level})})
			{/if}
		</IconValue>
	{/if}

	{#if data.iv !== null}
		<IconValue Icon={LibraryBig}>
			IVs: <b>{data.iv.toFixed(1)}%</b>
			({data.atk_iv ?? "?"}/{data.def_iv ?? "?"}/{data.sta_iv ?? "?"})
		</IconValue>
	{/if}


	{#if showLittle()}
		<IconValue Icon={Trophy}>
			{m.league_rank({ league: m.little_league() })}:
			<b>#{getRank("little")}</b>
		</IconValue>
	{/if}

	{#if showGreat()}
		<IconValue Icon={Trophy}>
			{m.league_rank({ league: m.great_league() })}:
			<b>#{getRank("great")}</b>
		</IconValue>
	{/if}

	{#if showUltra()}
		<IconValue Icon={Trophy}>
			{m.league_rank({ league: m.ultra_league() })}:
			<b>#{getRank("ultra")}</b>
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
				{pokemonName(data)}
				{#if data.display_pokemon_id}
					({pokemonName({ pokemon_id: data.display_pokemon_id })})
				{/if}
			</span>
		</div>
	{/snippet}

	{#snippet description()}
		{@render basicInfo()}
	{/snippet}

	{#snippet content()}
		<div class="mb-3">
			{@render basicInfo()}
		</div>

		{#if showLittle() || showGreat() || showUltra()}
		PVP Rankings:
		<div class="mb-3 space-y-1">
			{#each (data.pvp?.little ?? []) as entry}
				{#if (entry.rank ?? 100000) <= POKEMON_MIN_RANK}
					<PvpEntry data={entry} league="little" />
				{/if}
			{/each}
			{#each data.pvp?.great ?? [] as entry}
				{#if (entry.rank ?? 100000) <= POKEMON_MIN_RANK}
					<PvpEntry data={entry} league="great" />
				{/if}
			{/each}
			{#each (data.pvp?.ultra ?? []) as entry}
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
			Icon={weatherIcons[data.weather] ?? CloudOff}
		>
			{#if data.weather}
				{m.weather_boost()}:
				<b>{ingame("weather_" + data.weather)}</b>
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
				<b>{ingame("move_" + data.move_1)}</b>
				/
				<b>{ingame("move_" + data.move_2)}</b>
			</IconValue>
		{/if}

		<div class="h-3"></div>

		{#if data.first_seen_timestamp !== data.updated}
			<IconValue Icon={SearchCheck}>
				{m.last_seen()}: <b><Countdown expireTime={data.updated} /></b>
			</IconValue>
		{/if}

		<IconValue Icon={Search}>
			{m.first_seen()}:  <b><Countdown expireTime={data.first_seen_timestamp} /></b>
		</IconValue>

	{/snippet}
</BasePopup>
