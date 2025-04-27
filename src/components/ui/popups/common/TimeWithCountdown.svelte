<script lang="ts">
	import { timestampToLocalTime } from '@/lib/utils.svelte.js';
	import Countdown from '@/components/utils/Countdown.svelte';

	let {
		expireTime,
		showHours = false,
		nowrap = false,
		showDate = false
	}: {
		expireTime: number | null | undefined
		showHours?: boolean
		nowrap?: boolean
		showDate?: boolean
	} = $props()
</script>

<span class:whitespace-nowrap={nowrap}>
	<b>
		{timestampToLocalTime(expireTime, Boolean(showDate))}
	</b>
	(<Countdown {expireTime} {showHours} />)
</span>
