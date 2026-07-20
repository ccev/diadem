<script lang="ts">
	import { untrack, type Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import { getDrawerContext } from "./context.svelte.js";
	import { drawerGesture } from "./gesture.js";

	let {
		children,
		ref = $bindable(),
		style,
		...props
	}: HTMLAttributes<HTMLDivElement> & {
		children?: Snippet;
		ref?: HTMLDivElement;
	} = $props();
	const state = getDrawerContext();
	$effect(() => {
		const viewport = ref;
		untrack(() => state.setViewport(viewport));
		return () => state.setViewport();
	});
</script>

<div
	bind:this={ref}
	{...props}
	{@attach drawerGesture(state)}
	data-open={state.open ? "" : undefined}
	data-closed={!state.open ? "" : undefined}
	data-nested={state.parent ? "" : undefined}
	data-starting-style={state.starting ? "" : undefined}
	data-ending-style={state.ending ? "" : undefined}
	style:--drawer-keyboard-inset="0px"
	{style}
>
	{@render children?.()}
</div>
