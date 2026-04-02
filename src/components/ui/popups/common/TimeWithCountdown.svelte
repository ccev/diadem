<script lang="ts">
	import Countdown from "@/components/utils/Countdown.svelte";

	import { timestampToLocalTime } from "@/lib/utils/timestampToLocalTime";

	let {
		expireTime,
		showHours = false,
		nowrap = false,
		showDate = false
	}: {
		expireTime: number | null | undefined;
		showHours?: boolean;
		nowrap?: boolean;
		showDate?: boolean;
	} = $props();
</script>

<span class:whitespace-nowrap={nowrap}>
	<b>
		{timestampToLocalTime(expireTime, Boolean(showDate))}
	</b>
	(<Countdown {expireTime} {showHours} />)
</span>
