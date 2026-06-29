<script lang="ts">
	import { Clock, ClockAlert, ClockArrowUp, Gift, ScanEye, Search } from "lucide-svelte";
	import Countdown from "@/components/utils/Countdown.svelte";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import * as m from "@/lib/paraglide/messages";

	import { timestampToLocalTime } from "@/lib/utils/timestampToLocalTime";
	import { isFortOutdated } from "@/lib/utils/gymUtils";
	import { formatRatio } from "$lib/utils/numberFormat";
	import StatsMainCardEntry from "@/components/ui/popups2/common/StatsMainCardEntry.svelte";
	import { currentTimestamp } from "$lib/utils/currentTimestamp";

	let {
		updated,
		lastModified,
		firstSeen
	}: {
		updated?: number;
		lastModified?: number;
		firstSeen?: number;
	} = $props();
</script>

{#if updated}
	<StatsMainCardEntry
		Icon={Clock}
		name={m.last_seen()}
	>
		{#snippet value()}
			{#if currentTimestamp() - updated > 60 * 60 * 24}
				{timestampToLocalTime(updated, true, false)}
			{:else}
				<Countdown expireTime={updated} />
			{/if}
		{/snippet}
	</StatsMainCardEntry>
{/if}

{#if lastModified}
	<StatsMainCardEntry
		Icon={ClockArrowUp}
		name={m.last_updated()}
	>
		{#snippet value()}
			{#if currentTimestamp() - lastModified > 60 * 60 * 24}
				{timestampToLocalTime(lastModified, true, false)}
			{:else}
				<Countdown expireTime={lastModified} />
			{/if}
		{/snippet}
	</StatsMainCardEntry>
{/if}

{#if firstSeen}
	<StatsMainCardEntry
		Icon={Search}
		name={m.first_seen()}
	>
		{#snippet value()}
			{#if currentTimestamp() - firstSeen > 60 * 60 * 24}
				{timestampToLocalTime(firstSeen, true, false)}
			{:else}
				<Countdown expireTime={firstSeen} />
			{/if}
		{/snippet}
	</StatsMainCardEntry>
{/if}
