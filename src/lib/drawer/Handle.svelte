<script lang="ts">
	import type { HTMLButtonAttributes } from "svelte/elements";
	import { getDrawerContext } from "./context.svelte.js";

	let { class: class_ = "", ...props }: HTMLButtonAttributes = $props();
	const state = getDrawerContext();

	const snapPoints = $derived(state.options.getSnapPoints());
	const isTogglable = $derived((snapPoints?.length ?? 0) >= 2);

	function toggleSnapPoint() {
		if (!isTogglable) return;

		const currentIndex = Math.max(
			0,
			snapPoints.findIndex((point) => Object.is(point, state.snapPoint))
		);
		state.changeSnapPoint(snapPoints[(currentIndex + 1) % snapPoints.length]);
	}
</script>

<button
	type="button"
	disabled={!isTogglable}
	aria-label="Toggle drawer size"
	aria-expanded={state.snapPoint === snapPoints?.at(-1)}
	class="mx-auto flex h-7 w-12 shrink-0 items-center justify-center rounded-full touch-none {class_}"
	class:cursor-pointer={isTogglable}
	{...props}
	onclick={toggleSnapPoint}
>
	<span class="h-1 w-10 rounded-full bg-ring"></span>
</button>
