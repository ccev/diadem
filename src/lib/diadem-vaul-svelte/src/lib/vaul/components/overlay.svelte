<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import type { OverlayProps } from "./types.js";
	import { getCtx } from "../ctx.js";

	type $$Props = OverlayProps;

	const {
		refs: { overlayRef },
		states: { isOpen, visible, snapPoints, shouldFade },
		methods: { onRelease },
	} = getCtx();

	let hasSnapPoints = false;
	let overlayEl: HTMLDivElement | null = null;

	$: hasSnapPoints = !!$snapPoints?.length;
	$: overlayRef.set(overlayEl ?? undefined);
</script>

<DialogPrimitive.Overlay {...$$restProps}>
	{#snippet child({ props })}
		<div
			{...props}
			bind:this={overlayEl}
			on:mouseup={onRelease}
			data-vaul-drawer-visible={$visible ? "true" : "false"}
			data-vaul-overlay=""
			data-vaul-snap-points={$isOpen && hasSnapPoints ? "true" : "false"}
			data-vaul-snap-points-overlay={$isOpen && $shouldFade ? "true" : "false"}
		></div>
	{/snippet}
</DialogPrimitive.Overlay>
