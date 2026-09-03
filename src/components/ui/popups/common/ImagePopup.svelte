<script lang="ts">
	import type { HTMLImgAttributes } from "svelte/elements";

	let {
		src,
		alt,
		class: class_ = "",
		...rest
	}: {
		src: string;
		alt: string;
		class?: string;
	} & HTMLImgAttributes = $props();

	let img: HTMLImageElement | undefined = $state(undefined);
	let isLoading: boolean = $state(true);
	let lastSrc: string = "";

	$effect(() => {
		if (lastSrc === src) return;
		lastSrc = src;

		if (!img) return;

		const timeout = setTimeout(() => {
			isLoading = false;
		}, 1000);

		isLoading = true;
		img.onload = () => {
			clearTimeout(timeout);
			isLoading = false;
		};
		img.src = src;
	});
</script>

<img bind:this={img} {alt} class="text-sm object-contain {class_}" {...rest} class:hidden={isLoading} />
