<script lang="ts">
	import type { HTMLButtonAttributes } from "svelte/elements";
	import { getDrawerContext } from "./context.svelte.js";

	let { class: class_ = "", ...props }: HTMLButtonAttributes = $props();
	const state = getDrawerContext();

	function toggleSnapPoint() {
		const snapPoints = state.options.getSnapPoints();
		if (!snapPoints || snapPoints.length < 2) return;

		const currentIndex = Math.max(
			0,
			snapPoints.findIndex((point) => Object.is(point, state.snapPoint))
		);
		state.changeSnapPoint(snapPoints[(currentIndex + 1) % snapPoints.length]);
	}
</script>

<button
	type="button"
	aria-label="Toggle drawer size"
	aria-expanded={state.snapPoint === state.options.getSnapPoints()?.at(-1)}
	class="mx-auto flex h-7 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full touch-none {class_}"
	{...props}
	onclick={toggleSnapPoint}
>
	<span class="h-1 w-10 rounded-full bg-ring"></span>
</button>
