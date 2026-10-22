<script lang="ts">
	import Countdown from "@/components/utils/Countdown.svelte";
	import { currentTimestamp } from "@/lib/utils/currentTimestamp";
	import { timestampToLocalTime } from "@/lib/utils/timestampToLocalTime";

	let { timestamp }: { timestamp: number } = $props();
</script>

<span>
	{#if currentTimestamp() - timestamp > 60 * 60 * 24}
		{timestampToLocalTime(timestamp, { showDate: true, showSeconds: false, showTime: false })}
	{:else}
		<Countdown expireTime={timestamp} />
	{/if}
</span>
