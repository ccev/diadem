<script lang="ts">
	import { onDestroy, onMount, untrack } from "svelte";
	import * as m from "@/lib/paraglide/messages"
	import { currentTimestamp } from '@/lib/utils/currentTimestamp';
	import { getCountdownString, startCountdown, stopCountdown } from "@/lib/utils/countdown.svelte";

	let {
		expireTime,
		showHours = false
	}: {
		expireTime: number | null | undefined,
		showHours?: boolean
	} = $props()

	let id: symbol | undefined = startCountdown(expireTime, showHours)
	let time = $derived(getCountdownString(id))

	// onMount(() => {
	// 	id = startCountdown(expireTime, showHours)
	// })

	onDestroy(() => stopCountdown(id))
</script>

{time}
