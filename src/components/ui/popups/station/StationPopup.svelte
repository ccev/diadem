<script lang="ts">
	import type { StationData } from '@/lib/types/mapObjectData/station';
	import BasePopup from '@/components/ui/popups/BasePopup.svelte';
	import { getIconPokemon, getIconStation } from '@/lib/services/uicons.svelte.js';
	import ImagePopup from '@/components/ui/popups/common/ImagePopup.svelte';
	import * as m from '@/lib/paraglide/messages';
	import { getMapObjects } from '@/lib/mapObjects/mapObjectsState.svelte.js';
	import { mPokemon } from '@/lib/services/ingameLocale';
	import { getCurrentSelectedData, getCurrentSelectedMapId } from "@/lib/mapObjects/currentSelectedState.svelte";
	import IconValue from '@/components/ui/popups/common/IconValue.svelte';
	import { Clock, ClockArrowDown, ClockArrowUp, MapPinned, Star, UsersRound } from 'lucide-svelte';
	import TimeWithCountdown from '@/components/ui/popups/common/TimeWithCountdown.svelte';
	import Countdown from '@/components/utils/Countdown.svelte';
	import { currentTimestamp } from '@/lib/utils/currentTimestamp';
	import { getStationPokemon, getStationTitle, STATION_SLOTS } from '@/lib/utils/stationUtils';

	let data: StationData = $derived(getMapObjects()[getCurrentSelectedMapId()] as StationData ?? getCurrentSelectedData() as StationData)
</script>

{#snippet basicInfo()}
	{#if data.battle_pokemon_id}
		<IconValue Icon={MapPinned}>
			{m.pogo_station()}: <b>{data.name}</b>
		</IconValue>
	{/if}

	<IconValue Icon={ClockArrowUp}>
		{m.start()}: <TimeWithCountdown expireTime={data.start_time} showDate={true} />
	</IconValue>
	<IconValue Icon={ClockArrowDown}>
		{m.end()}: <TimeWithCountdown expireTime={data.end_time} showDate={true} />
	</IconValue>
{/snippet}

<BasePopup lat={data.lat} lon={data.lon}>
	{#snippet image()}
		<div class="w-12 h-12 shrink-0">
			{#if data.battle_pokemon_id}
			<ImagePopup
				alt={mPokemon(getStationPokemon(data))}
				src={getIconPokemon(getStationPokemon(data))}
				class="w-12 h-12"
			/>
			{:else}
			<ImagePopup
				alt={m.pogo_station()}
				src={getIconStation(data)}
				class="w-12"
			/>
			{/if}
		</div>
	{/snippet}

	{#snippet title()}
		<div class="text-lg font-semibold tracking-tight">
			<span>
				{getStationTitle(data)}
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

		{#if (data.start_time ?? 0) < currentTimestamp()}
			<IconValue Icon={Star}>
				{m.x_start_max_battle({ level: data.battle_level ?? 0 })}
			</IconValue>
			<IconValue Icon={UsersRound}>
				Stationed: <b>{data.total_stationed_pokemon}</b>/{STATION_SLOTS} (Gmax: <b>{data.total_stationed_gmax}</b>)
			</IconValue>

	<!--		<StationedPokemonDisplay stationed={data.stationed_pokemon} />-->
		{/if}

		<IconValue Icon={Clock}>
			{m.last_updated()}: <b><Countdown expireTime={data.updated} /></b>
		</IconValue>
	{/snippet}
</BasePopup>
