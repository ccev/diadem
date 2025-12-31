<script lang="ts">
	import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
	import { getCurrentSelectedData, getCurrentSelectedMapId } from "@/lib/mapObjects/currentSelectedState.svelte";
	import BasePopup from "@/components/ui/popups/BasePopup.svelte";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import type { TappableData } from "@/lib/types/mapObjectData/tappable.d.ts";
	import { mItem, mPokemon } from "@/lib/services/ingameLocale";
	import { getIconPokemon, getIconTappable } from "@/lib/services/uicons.svelte";
	import { m } from "@/lib/paraglide/messages";
	import { Clock, ClockAlert, RotateCcw, Trees } from "lucide-svelte";
	import { formatDecimal } from "@/lib/utils/numberFormat";
	import { hasTimer } from "@/lib/utils/pokemonUtils";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import TimeWithCountdown from "@/components/ui/popups/common/TimeWithCountdown.svelte";
	import Countdown from "@/components/utils/Countdown.svelte";
	import { getTappableName } from "@/lib/utils/tappableUtils";

	let data: TappableData = $derived(getMapObjects()[getCurrentSelectedMapId()] as TappableData ?? getCurrentSelectedData() as TappableData);
</script>

{#snippet basicInfo()}
	<IconValue Icon={Clock}>
		<span>
			{m.popup_despawns()}
		</span>

		<TimeWithCountdown
			expireTime={data.expire_timestamp}
		/>
	</IconValue>
	{#if !hasTimer(data)}
		<IconValue Icon={ClockAlert}>
			{m.time_is_estimated()}
		</IconValue>
	{/if}
{/snippet}

<BasePopup lat={data.lat} lon={data.lon}>
	{#snippet image()}
		<div class="w-12 shrink-0">
			<ImagePopup
				alt={getTappableName(data)}
				src={getIconTappable(data)}
				class="w-12 h-12"
			/>
		</div>
	{/snippet}

	{#snippet title()}
		<div class="text-lg font-semibold tracking-tight">
			<span>
				{getTappableName(data)} ({m.pogo_tappable()})
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

		<IconValue Icon={Clock}>
			{m.last_updated()}: <b>
				<Countdown expireTime={data.updated} />
			</b>
		</IconValue>
	{/snippet}
</BasePopup>