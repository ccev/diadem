<script lang="ts">
	import type { PokemonData } from '@/lib/types/mapObjectData/pokemon';
	import Countdown from '@/components/utils/Countdown.svelte';
	import { timestampToLocalTime } from '@/lib/utils';
	import BasePopup from '@/components/ui/popups/BasePopup.svelte';
	import PopupImage from '@/components/ui/popups/PopupImage.svelte';
	import { getIconPokemon } from '@/lib/uicons.svelte';
	import { Clock, ClockAlert, SearchX, MapPinX, DraftingCompass, ChartBar, Ruler } from 'lucide-svelte';
	import IconValue from '@/components/ui/popups/IconValue.svelte';
	import {getMasterPokemon, defaultProp} from '@/lib/masterfile';
	import type { MasterPokemon } from '@/lib/types/masterfile';
	import TextSeparator from '@/components/utils/TextSeparator.svelte';

	let {data} : {data: PokemonData} = $props()

	let masterPokemon: MasterPokemon | undefined = $derived(getMasterPokemon(data.pokemon_id))

	function hasTimer() {
		return data.expire_timestamp && data.expire_timestamp_verified
	}
</script>

{#snippet timer()}
	<IconValue>
		{#snippet icon()}
			{#if hasTimer()}
				<Clock size="16" />
			{:else}
				<ClockAlert size="16" />
			{/if}
		{/snippet}

		{#snippet value()}
			{#if !hasTimer()}
				<span>Found</span>
			{/if}

			<span class="font-semibold">
				{timestampToLocalTime(hasTimer() ? data.expire_timestamp : data.first_seen_timestamp)}
			</span>

			<span class="ml-0.5">
				(<Countdown expireTime={hasTimer() ? data.expire_timestamp : data.first_seen_timestamp} />)
			</span>
		{/snippet}
	</IconValue>
{/snippet}

{#snippet basicInfo()}
	{@render timer()}

	{#if data.seen_type?.includes("nearby")}
		<IconValue>
			{#snippet icon()}
				<MapPinX size="16"/>
			{/snippet}
			{#snippet value()}
				Estimated location
			{/snippet}
		</IconValue>
	{/if}

	{#if data.iv === null}
		<IconValue>
			{#snippet icon()}
				<SearchX size="16"/>
			{/snippet}
			{#snippet value()}
				No IV scanned
			{/snippet}
		</IconValue>
	{/if}

	{#if data.cp !== null || data.level !== null}
		<IconValue>
			{#snippet icon()}
				<ChartBar size="16"/>
			{/snippet}
			{#snippet value()}
				{#if data.cp !== null}
					<span class="font-semibold">{data.cp} CP</span>
				{/if}
				{#if data.cp !== null && data.level !== null}
					<TextSeparator />
				{/if}
				{#if data.level !== null}
					<span>Level</span>
					<span>{data.level}</span>
				{/if}
			{/snippet}
		</IconValue>
	{/if}
{/snippet}

<BasePopup lat={data.lat} lon={data.lon}>
	{#snippet image()}
		<PopupImage
			alt={data.pokemon_id.toString()}
			src={getIconPokemon(data)}
			class="w-12 h-12"
		/>
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
				{defaultProp(masterPokemon, "name", "Pokemon")}
				{#if data.display_pokemon_id}
					({defaultProp(getMasterPokemon(data.display_pokemon_id), "name", "Pokemon")})
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
			<IconValue>
				{#snippet icon()}
					<Ruler size="16"/>
				{/snippet}
				{#snippet value()}
					<span>
						Size M
					</span>
					<span class="ml-0.5">
						({data.height?.toFixed(2)}m,
						{data.weight?.toFixed(2)}kg)
					</span>

				{/snippet}
			</IconValue>
		{/if}



	{/snippet}
</BasePopup>
