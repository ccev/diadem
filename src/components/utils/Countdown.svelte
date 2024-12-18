<script lang="ts">
	import { untrack } from 'svelte';

	let {
		expireTime,
		showHours = false
	}: {
		expireTime: number | null,
		showHours?: boolean
	} = $props()

	if (!expireTime) {
		expireTime = 0
	}

	let formattedTime: string = $state("")
	let remainingTime: number = expireTime - Math.floor(Date.now() / 1000)
	let interval: NodeJS.Timeout | undefined

	function updateCountdown() {
		const isPast = remainingTime < 0
		const absRemainingTime = Math.abs(remainingTime)

		const seconds = absRemainingTime % 60
		let minutes: number
		let prefix = ""
		const nbsp = "\u00A0"

		if (showHours) {
			const hours = Math.floor(absRemainingTime / 3600)
			minutes = Math.floor((absRemainingTime % 3600) / 60)
			prefix = `${hours}h${nbsp}`
		} else {
			minutes = Math.floor(absRemainingTime / 60)
		}

		console.log("time update")

		formattedTime = `${prefix}${minutes}m${nbsp}${seconds}s`
		if (isPast) {
			formattedTime += `${nbsp}ago`
		}

		remainingTime -= 1
	}

	$effect(() => {
		expireTime

		untrack(() => {
			remainingTime = expireTime - Math.floor(Date.now() / 1000)
			updateCountdown()
		})
		interval = setInterval(updateCountdown, 1000)

		return () => {
			if (interval) clearInterval(interval)
		}
	})
</script>

{formattedTime}
