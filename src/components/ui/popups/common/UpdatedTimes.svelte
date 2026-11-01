<script lang="ts">
	import { Clock, ClockArrowUp, Search } from "@lucide/svelte";
	import * as m from "@/lib/paraglide/messages";
	import StatsMainCardEntry from "@/components/ui/popups/common/StatsMainCardEntry.svelte";
	import UpdatedTimeCountdown from "@/components/ui/popups/common/UpdatedTimeCountdown.svelte";

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
	<StatsMainCardEntry Icon={Clock} name={m.last_seen()}>
		{#snippet value()}
			<UpdatedTimeCountdown timestamp={updated} />
		{/snippet}
	</StatsMainCardEntry>
{/if}

{#if lastModified}
	<StatsMainCardEntry Icon={ClockArrowUp} name={m.last_updated()}>
		{#snippet value()}
			<UpdatedTimeCountdown timestamp={lastModified} />
		{/snippet}
	</StatsMainCardEntry>
{/if}

{#if firstSeen}
	<StatsMainCardEntry Icon={Search} name={m.first_seen()}>
		{#snippet value()}
			<UpdatedTimeCountdown timestamp={firstSeen} />
		{/snippet}
	</StatsMainCardEntry>
{/if}
