<script lang="ts">
	import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
	import { getCurrentSelectedData, getCurrentSelectedMapId } from "@/lib/mapObjects/currentSelectedState.svelte";
	import type { NestData } from "@/lib/types/mapObjectData/nest.d.ts";
	import BasePopup from "@/components/ui/popups/BasePopup.svelte";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import { mPokemon } from "@/lib/services/ingameLocale";
	import { getIconPokemon } from "@/lib/services/uicons.svelte";
	import { m } from "@/lib/paraglide/messages";
	import { CircleSlash2, Clock, MapPinned, RotateCcw, Trees, VectorSquare } from "lucide-svelte";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import Countdown from "@/components/utils/Countdown.svelte";
	import { formatDecimal, formatNumber, formatPercentage } from "@/lib/utils/numberFormat";

	let data: NestData = $derived(getMapObjects()[getCurrentSelectedMapId()] as NestData ?? getCurrentSelectedData() as NestData);
</script>

{#snippet basicInfo()}
	{#if data.name}
		<IconValue Icon={Trees}>
			{m.park_name()}: <b>{data.name}</b>
		</IconValue>
	{/if}
	<IconValue Icon={RotateCcw}>
		{m.nest_avg()}: <b>{m.nest_avg_value({ avg: formatDecimal(data.pokemon_avg) })}</b>
	</IconValue>
{/snippet}

<BasePopup lat={data.lat} lon={data.lon}>
	{#snippet image()}
		<div class="w-12 shrink-0">
			<ImagePopup
				alt={mPokemon(data)}
				src={getIconPokemon(data)}
				class="w-12 h-12"
			/>
		</div>
	{/snippet}

	{#snippet title()}
		<div class="text-lg font-semibold tracking-tight">
			<span>
				{m.pokemon_nest({ pokemon: mPokemon(data) })}
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

		<IconValue Icon={CircleSlash2}>
			{m.nest_ratio()}: <b>{formatPercentage((data.pokemon_ratio ?? 0) / 100)}</b>
		</IconValue>

		<IconValue Icon={MapPinned}>
			{m.nest_spawnpoint_count()}: <b>{formatNumber(data.spawnpoints)}</b>
		</IconValue>

		<IconValue Icon={VectorSquare}>
			{m.nest_size()}: <b>{m.square_m_value({ size: formatNumber(data.m2, { maximumFractionDigits: 0 }) })}</b>
		</IconValue>

		<IconValue Icon={Clock}>
			{m.last_updated()}: <b>
				<Countdown expireTime={data.updated} />
			</b>
		</IconValue>
	{/snippet}
</BasePopup>