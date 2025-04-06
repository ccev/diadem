<script lang="ts">
	import { timestampToLocalTime } from '@/lib/utils.svelte.js';
	import Countdown from '@/components/utils/Countdown.svelte';

	let {
		expireTime,
		showHours = false,
		nowrap = false
	}: {
		expireTime: number | null
		showHours?: boolean
		nowrap?: boolean
	} = $props()
</script>

<span class:whitespace-nowrap={nowrap}>
	<b>
		{timestampToLocalTime(expireTime)}
	</b>
	(<Countdown {expireTime} {showHours} />)
</span>
