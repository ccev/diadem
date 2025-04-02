<script lang="ts">
	import { untrack } from 'svelte';
	import * as m from "@/lib/paraglide/messages"
	import { currentTimestamp } from '@/lib/utils.svelte';


	let {
		expireTime,
		showHours = false
	}: {
		expireTime: number | null | undefined,
		showHours?: boolean
	} = $props()

	if (!expireTime) {
		expireTime = 0
	}

	let formattedTime: string = $state("")
	let remainingTime: number = (expireTime ?? 0) - currentTimestamp()
	let interval: NodeJS.Timeout | undefined

	function updateCountdown() {
		const isPast = remainingTime < 0
		const absRemainingTime = Math.abs(remainingTime)

		const seconds = absRemainingTime % 60
		let minutes: number

		if (showHours) {
			const hours = Math.floor(absRemainingTime / 3600)
			minutes = Math.floor((absRemainingTime % 3600) / 60)

			if (isPast) {
				formattedTime = m.time_format_h_m_s_ago({h: hours, m: minutes, s: seconds})
			} else {
				formattedTime = m.time_format_h_m_s({h: hours, m: minutes, s: seconds})

			}
		} else {
			minutes = Math.floor(absRemainingTime / 60)

			if (isPast) {
				formattedTime = m.time_format_m_s_ago({m: minutes, s: seconds})
			} else {
				formattedTime = m.time_format_m_s({m: minutes, s: seconds})

			}
		}

		formattedTime = formattedTime.replaceAll(" ", "\u00A0")

		remainingTime -= 1
	}

	$effect(() => {
		expireTime

		untrack(() => {
			remainingTime = expireTime - currentTimestamp()
			updateCountdown()
		})
		interval = setInterval(updateCountdown, 1000)

		return () => {
			if (interval) clearInterval(interval)
		}
	})
</script>

{formattedTime}
