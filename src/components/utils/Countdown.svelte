<script lang="ts">
	import { onDestroy } from "svelte";
	import { getCountdownString, startCountdown, stopCountdown } from "@/lib/utils/countdown.svelte";

	let {
		expireTime,
		showHours = false
	}: {
		expireTime: number | null | undefined,
		showHours?: boolean
	} = $props()

	let id: symbol | undefined = undefined
	let time = $derived(getCountdownString(id))

	$effect(() => {
		if (id) stopCountdown(id)
		id = startCountdown(expireTime, showHours)
	})

	onDestroy(() => {
		 if (id) stopCountdown(id)
	})
</script>

{time}
