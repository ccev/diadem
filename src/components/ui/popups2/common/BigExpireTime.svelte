<script lang="ts">
	import Countdown from "@/components/utils/Countdown.svelte";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import { Clock } from "@lucide/svelte";

	let {
		expire,
		showSeconds = true,
		showDate = false,
		showIcon = true
	}: {
		expire?: number,
		showSeconds?: boolean,
		showDate?: boolean
		showIcon?: boolean
	} = $props();
</script>

<div class="flex justify-between items-center gap-3 flex-wrap gap-y-2">
	<div
		class="justify-center font-medium flex gap-2 items-center rounded-md bg-accent-highlight- border-2 border-accent-highlight pl-4 pr-6 py-2 grow basis-1 whitespace-nowrap"
	>
		{#if showIcon}
			<Clock class="size-4" />
		{/if}
		<p>
			{timestampToLocalTime(expire, { showSeconds, showDate })}
		</p>
	</div>

	<div
		class="justify-center font-medium flex gap-2 items-center rounded-md bg-accent-highlight- border-2 border-accent-highlight pl-4 pr-6 py-2 grow basis-1 shrink"
	>
		<Countdown expireTime={expire} />
	</div>
</div>