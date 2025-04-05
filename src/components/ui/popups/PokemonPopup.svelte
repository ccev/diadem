<script lang="ts">
	import type { PokemonData } from '@/lib/types/mapObjectData/pokemon';
	import Countdown from '@/components/utils/Countdown.svelte';
	import { timestampToLocalTime } from '@/lib/utils.svelte';
	import BasePopup from '@/components/ui/popups/BasePopup.svelte';
	import ImagePopup from '@/components/ui/popups/ImagePopup.svelte';
	import { getIconPokemon } from '@/lib/uicons.svelte';
	import { Clock, ClockAlert, SearchX, MapPinX, DraftingCompass, ChartBar, Ruler } from 'lucide-svelte';
	import IconValue from '@/components/ui/popups/IconValue.svelte';
	import {getMasterPokemon, defaultProp} from '@/lib/masterfile';
	import type { MasterPokemon } from '@/lib/types/masterfile';
	import TextSeparator from '@/components/utils/TextSeparator.svelte';
	import * as m from "@/lib/paraglide/messages"
	import { getConfig } from '@/lib/config';
	import { ingame, pokemonName } from '@/lib/ingameLocale';
	import TimeWithCountdown from '@/components/ui/popups/TimeWithCountdown.svelte';
	import { getMapObjects } from '@/lib/mapObjects/mapObjects.svelte';

	let { mapId } : { mapId: string } = $props()
	let data: PokemonData = $derived(getMapObjects()[mapId] as PokemonData)

	let masterPokemon: MasterPokemon | undefined = $derived(getMasterPokemon(data.pokemon_id))

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
</script>

<svelte:head>
	<title>{getTitle()}</title>
</svelte:head>

{#snippet timer()}
	<IconValue Icon={hasTimer() ? Clock : ClockAlert}>
		{#if !hasTimer()}
			<span>{m.popup_found()}</span>
		{/if}

		<TimeWithCountdown
			expireTime={hasTimer() ? data.expire_timestamp : data.first_seen_timestamp}
		/>
	</IconValue>
{/snippet}

{#snippet basicInfo()}
	{@render timer()}

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
		<IconValue Icon={ChartBar}>
			{#if data.cp !== null}
				<span class="font-semibold">
					{m.pogo_cp({cp: data.cp})}
				</span>
			{/if}
			{#if data.cp !== null && data.level !== null}
				<TextSeparator />
			{/if}
			{#if data.level !== null}
				{m.pogo_level({level: data.level})}
			{/if}
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
				{pokemonName(data.pokemon_id)}
				{#if data.display_pokemon_id}
					{pokemonName(data.display_pokemon_id)}
				{/if}
			</span>
		</div>
	{/snippet}

	{#snippet description()}
		{@render basicInfo()}
	{/snippet}

	{#snippet content()}
		<div class="mb-2">
			{@render basicInfo()}
		</div>

		{#if data.size !== null}
			<IconValue Icon={Ruler}>
				<span>
					Size M
				</span>
			</IconValue>
		{/if}



	{/snippet}
</BasePopup>
