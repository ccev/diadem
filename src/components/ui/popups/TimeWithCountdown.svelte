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

<span class="font-semibold">
	{timestampToLocalTime(expireTime)}
</span>
<span class="ml-0.5">
	(<Countdown {expireTime} {showHours} />)
</span>