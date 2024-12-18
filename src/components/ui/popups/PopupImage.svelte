<script lang="ts">
	let {
		src,
		alt,
		class: class_
	}: {
		src: string,
		alt: string,
		class: string
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

<div class="shrink-0 text-sm {class_}">
	<img
		bind:this={img}
		{alt}
		class="aspect-square"
		class:hidden={isLoading}
	>
</div>