<script lang="ts">
	import { Dialog } from "bits-ui";
	import type { Dialog as DialogTypes } from "bits-ui";
	import { getDrawerContext } from "./context.svelte.js";

	let {
		forceRender = false,
		ref = $bindable(),
		style,
		onclick,
		onpointerup,
		...props
	}: DialogTypes.OverlayProps & {
		forceRender?: boolean;
	} = $props();
	const state = getDrawerContext();
	function closeFromOutside(event: MouseEvent | PointerEvent) {
		if (!event.defaultPrevented && !state.options.getDisablePointerDismissal()) {
			state.requestOpen(false, "outside-press", event);
		}
	}
	$effect(() => {
		state.backdrop = (ref as HTMLDivElement | null | undefined) ?? undefined;
	});
</script>

{#if !state.parent || forceRender}
	<Dialog.Overlay {...props} forceMount={props.forceMount}>
		{#snippet child({ props: overlayProps })}
			<div
				{...overlayProps}
				bind:this={ref}
				role="presentation"
				data-open={state.open ? "" : undefined}
				data-closed={!state.open ? "" : undefined}
				data-starting-style={state.starting ? "" : undefined}
				data-ending-style={state.ending ? "" : undefined}
				data-swiping={state.swiping ? "" : undefined}
				data-swipe-dismiss={state.swipeDismissed ? "" : undefined}
				style:--drawer-swipe-progress={state.swipeProgress}
				style:--drawer-swipe-strength={state.swipeStrength}
				style:--drawer-height={`${state.frontmostHeight}px`}
				{style}
				onclick={(event) => {
					if (typeof overlayProps.onclick === "function") overlayProps.onclick(event);
					onclick?.(event);
					closeFromOutside(event);
				}}
				onpointerup={(event) => {
					onpointerup?.(event);
					closeFromOutside(event);
				}}
			></div>
		{/snippet}
	</Dialog.Overlay>
{/if}
