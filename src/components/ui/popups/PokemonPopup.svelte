<script lang="ts">
	import type { PokemonData } from '@/lib/types/mapObjectData/pokemon';
	import Countdown from '@/components/utils/Countdown.svelte';
	import { timestampToLocalTime } from '@/lib/utils';
	import BasePopup from '@/components/ui/popups/BasePopup.svelte';

	let {data} : {data: PokemonData} = $props()
</script>

{#snippet timer()}
	{#if data.expire_timestamp && data.expire_timestamp_verified}
		<span>
			Until
		</span>
		<span class="font-semibold">
			{timestampToLocalTime(data.expire_timestamp)}
		</span>
		<span>
			(<Countdown expireTime={data.expire_timestamp} />)
		</span>
	{/if}
{/snippet}

<BasePopup lat={data.lat} lon={data.lon} heightExp="188">
	{#snippet image()}
		<img
			alt={data.pokemon_id.toString()}
			src="https://raw.githubusercontent.com/whitewillem/PogoAssets/refs/heads/main/uicons-outline/pokemon/{data.pokemon_id}.png"
			class="h-12 w-12"
		>
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
			<span>Pokemon Name</span>
		</div>
	{/snippet}

	{#snippet description()}
		<div class="mt-1">
			<!--				<ValueLabel value={data.cp?.toFixed(0)} unit="CP" class="bg-amber-100 ring-amber-200 ring-2" />-->
			<!--				<ValueLabel value={data.level?.toFixed(0)} unit="Lvl" class="bg-teal-100 ring-teal-200 ring-2" />-->

			{@render timer()}

			<!--				<span>-->
			<!--					CP 206 | Lvl 18 | 15/13/8-->
			<!--				</span>-->

		</div>
	{/snippet}

	{#snippet content()}
		<div>
			{@render timer()}
		</div>
		<div>
			{#if data.cp}
				CP: {data.cp}
			{/if}
			{#if data.level}
				Level: {data.level}
			{/if}
		</div>
	{/snippet}
</BasePopup>
