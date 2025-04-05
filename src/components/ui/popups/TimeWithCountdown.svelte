<script lang="ts">
	import { timestampToLocalTime } from '@/lib/utils.svelte.js';
	import Countdown from '@/components/utils/Countdown.svelte';

	let {
		expireTime,
		showHours = false
	}: {
		expireTime: number | null,
		showHours?: boolean
	} = $props()
</script>

<b>
	{timestampToLocalTime(expireTime)}
</b>
<span class="ml-0.5">
	(<Countdown {expireTime} {showHours} />)
</span>