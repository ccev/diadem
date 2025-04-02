<script lang="ts">
	let {
		src,
		alt,
		class: class_ = ""
	}: {
		src: string,
		alt: string,
		class?: string
	} = $props()

	let img: HTMLImageElement | undefined = $state(undefined)
	let isLoading: boolean = $state(true)

	$effect(() => {
		src
		if (!img) return

		const timeout = setTimeout(() => {
			isLoading = false
		}, 1000)

		isLoading = true
		img.onload = () => {
			clearTimeout(timeout)
			isLoading = false
		}
		img.src = src
	})
</script>

<img
	bind:this={img}
	{alt}
	class="text-sm {class_}"
	class:hidden={isLoading}
>