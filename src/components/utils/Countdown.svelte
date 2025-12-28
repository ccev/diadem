<script lang="ts">
	import { onDestroy } from "svelte";
	import { getCountdownString, startCountdown, stopCountdown } from "@/lib/utils/countdown.svelte";
	import { watch } from "runed";

	let {
		expireTime,
		showHours = false
	}: {
		expireTime: number | null | undefined,
		showHours?: boolean
	} = $props();

	let id: symbol | undefined = $state(undefined);
	let time = $derived(getCountdownString(id));

	watch(
		() => [expireTime, showHours],
		() => {
			if (id) stopCountdown(id);
			id = startCountdown(expireTime, showHours);
		}
	);

	onDestroy(() => {
		if (id) stopCountdown(id);
	});
</script>

{time}
