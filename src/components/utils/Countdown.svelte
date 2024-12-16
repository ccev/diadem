<script lang="ts">
	let {
		expireTime,
		showHours = false
	}: {
		expireTime: number,
		showHours?: boolean
	} = $props()

	let formattedTime: string = $state("")
	let remainingTime: number = expireTime - Math.floor(Date.now() / 1000)
	let interval: NodeJS.Timeout | undefined

	function updateCountdown() {
		if (remainingTime <= 0) {
			if (showHours) {
				formattedTime = "0h 0m 0s"
			} else {
				formattedTime = "0m 0s"
			}

			if (interval) clearInterval(interval)
			return
		}

		const seconds = remainingTime % 60
		let minutes: number
		let prefix = ""
		const nbsp = "\u00A0"

		if (showHours) {
			const hours = Math.floor(remainingTime / 3600)
			minutes = Math.floor((remainingTime % 3600) / 60)
			prefix = `${hours}h${nbsp}`
		} else {
			minutes = Math.floor(remainingTime / 60)
		}

		formattedTime = `${prefix}${minutes}m${nbsp}${seconds}s`
		remainingTime -= 1
	}

	$effect(() => {
		if (interval) clearInterval(interval)
		remainingTime = expireTime - Math.floor(Date.now() / 1000)
		updateCountdown()
		interval = setInterval(updateCountdown, 1000)
	})

</script>

{formattedTime}
