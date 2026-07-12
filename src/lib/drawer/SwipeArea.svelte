<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import { getDrawerContext } from "./context.svelte.js";
	import type { DrawerSwipeDirection } from "./types.js";

	let {
		children,
		disabled = false,
		swipeDirection,
		ref = $bindable(),
		style,
		...props
	}: HTMLAttributes<HTMLDivElement> & {
		children?: Snippet;
		disabled?: boolean;
		swipeDirection?: DrawerSwipeDirection;
		ref?: HTMLDivElement;
	} = $props();
	const drawer = getDrawerContext();
	const opposites: Record<DrawerSwipeDirection, DrawerSwipeDirection> = {
		up: "down",
		down: "up",
		left: "right",
		right: "left"
	};
	let start = $state<{ x: number; y: number; time: number }>();
	let swiping = $state(false);
	let direction = $derived(swipeDirection ?? opposites[drawer.swipeDirection]);

	function displacement(x: number, y: number) {
		if (!start) return 0;
		if (direction === "up") return start.y - y;
		if (direction === "down") return y - start.y;
		if (direction === "left") return start.x - x;
		return x - start.x;
	}

	function move(event: PointerEvent) {
		if (!start || disabled) return;
		const distance = displacement(event.clientX, event.clientY);
		if (distance < 1) return;
		if (!drawer.open) drawer.requestOpen(true, "swipe", event, ref);
		swiping = true;
		drawer.swiping = true;
		const size =
			drawer.swipeDirection === "left" || drawer.swipeDirection === "right"
				? (drawer.popup?.offsetWidth ?? 0)
				: drawer.popupHeight;
		const remaining = Math.max(0, size - distance);
		const sign = drawer.swipeDirection === "up" || drawer.swipeDirection === "left" ? -1 : 1;
		drawer.setMovement(
			drawer.swipeDirection === "left" || drawer.swipeDirection === "right" ? remaining * sign : 0,
			drawer.swipeDirection === "up" || drawer.swipeDirection === "down" ? remaining * sign : 0
		);
	}

	function end(event: PointerEvent) {
		if (!start) return;
		const distance = displacement(event.clientX, event.clientY);
		const duration = Math.max(16, event.timeStamp - start.time);
		const size =
			drawer.swipeDirection === "left" || drawer.swipeDirection === "right"
				? (drawer.popup?.offsetWidth ?? 80)
				: drawer.popupHeight || 80;
		if (distance < size * 0.5 && distance / duration < 0.1 && drawer.open) {
			drawer.requestOpen(false, "swipe", event, ref);
		}
		drawer.resetSwipe();
		start = undefined;
		swiping = false;
	}
</script>

<div
	bind:this={ref}
	{...props}
	role="presentation"
	aria-hidden="true"
	data-open={drawer.open ? "" : undefined}
	data-closed={!drawer.open ? "" : undefined}
	data-disabled={disabled ? "" : undefined}
	data-swiping={swiping ? "" : undefined}
	data-swipe-direction={direction}
	style:pointer-events={disabled || (drawer.open && !swiping) ? "none" : undefined}
	style:touch-action={direction === "left" || direction === "right" ? "pan-y" : "pan-x"}
	{style}
	onpointerdown={(event) => {
		if (disabled || event.button !== 0) return;
		start = { x: event.clientX, y: event.clientY, time: event.timeStamp };
		ref?.setPointerCapture(event.pointerId);
	}}
	onpointermove={move}
	onpointerup={end}
	onpointercancel={end}
>
	{@render children?.()}
</div>
