<script lang="ts">
	import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
	import { getCurrentSelectedData, getCurrentSelectedMapId } from "@/lib/mapObjects/currentSelectedState.svelte";
	import BasePopup from "@/components/ui/popups/BasePopup.svelte";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import type { SpawnpointData } from "@/lib/types/mapObjectData/spawnpoint.d.ts";
	import { CircleAlert, Clock, ClockAlert, Search, SearchCheck } from "lucide-svelte";
	import { hasTimer } from "@/lib/utils/pokemonUtils";
	import * as m from "@/lib/paraglide/messages";
	import Countdown from "@/components/utils/Countdown.svelte";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import { isFortOutdated } from "@/lib/utils/gymUtils";
	import { getIconTappable } from "@/lib/services/uicons.svelte";
	import { SPAWNPOINT_OUTDATED_SECONDS } from "@/lib/constants";
	import { currentTimestamp } from "@/lib/utils/currentTimestamp";
	import { getMmSsFromSeconds } from "@/lib/utils/time";

	let data: SpawnpointData = $derived(getMapObjects()[getCurrentSelectedMapId()] as SpawnpointData ?? getCurrentSelectedData() as SpawnpointData);
	let isOutdated = $derived(data.last_seen < currentTimestamp() - SPAWNPOINT_OUTDATED_SECONDS)
</script>

{#snippet basicInfo()}
	{#if isOutdated}
		<IconValue Icon={CircleAlert}>
			{m.outdated_message()}
		</IconValue>
	{/if}
	{#if data.despawn_sec}
		<IconValue Icon={Clock}>
			{m.spawnpoint_despawns()}:
			<b>
				{getMmSsFromSeconds(data.despawn_sec)}
			</b>
		</IconValue>
	{:else}
		<IconValue Icon={ClockAlert}>
			{m.spawnpoint_unknown()}
		</IconValue>
	{/if}
{/snippet}

<BasePopup lat={data.lat} lon={data.lon}>
	{#snippet image()}
		<div
			class="w-12 h-12 --bg-cyan border-4 rounded-full shrink-0"
			class:border-cyan-400={!isOutdated}
			class:bg-cyan-200={!isOutdated}
			class:dark:border-sky-500={!isOutdated}
			class:dark:bg-sky-600={!isOutdated}
			class:border-rose-400={isOutdated}
			class:bg-rose-300={isOutdated}
			class:dark:border-rose-500={isOutdated}
			class:dark:bg-rose-700={isOutdated}
		></div>
	{/snippet}

	{#snippet title()}
		<div class="text-lg font-semibold tracking-tight">
			<span>
				{m.pogo_spawnpoint()}
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
		<IconValue Icon={SearchCheck}>
			{m.last_seen()}: <b>
				<Countdown expireTime={data.last_seen} />
			</b>
		</IconValue>
		<IconValue Icon={Search}>
			{m.first_seen()}: <b>
				<Countdown expireTime={data.first_seen} />
			</b>
		</IconValue>
	{/snippet}
</BasePopup>