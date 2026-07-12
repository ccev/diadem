<script lang="ts">
	import { Dialog } from "bits-ui";
	import { onDestroy, untrack, type Snippet } from "svelte";
	import type { Dialog as DialogTypes } from "bits-ui";
	import { getDrawerContext } from "./context.svelte.js";

	let {
		children,
		ref = $bindable(),
		style,
		onOpenAutoFocus,
		onCloseAutoFocus,
		onEscapeKeydown,
		onInteractOutside,
		onFocusOutside,
		...props
	}: DialogTypes.ContentProps & { children?: Snippet } = $props();
	const state = getDrawerContext();
	let nestedReported = false;
	let nestedPresenceReported = false;

	function reportNested(open: boolean) {
		if (!state.parent || open === nestedReported) return;
		nestedReported = open;
		state.parent.setNestedOpen(open);
	}

	function reportNestedPresence(present: boolean) {
		if (!state.parent || present === nestedPresenceReported) return;
		nestedPresenceReported = present;
		state.parent.setNestedPresence(present);
		if (!present) state.parent.setNestedHeight(0);
	}

	$effect(() => {
		const open = state.open;
		untrack(() => reportNested(open));
	});

	$effect(() => {
		const present = state.open || (state.ending && state.mounted);
		untrack(() => reportNestedPresence(present));
	});

	onDestroy(() => {
		reportNested(false);
		reportNestedPresence(false);
	});

	$effect(() => {
		const popup = (ref as HTMLDivElement | null | undefined) ?? undefined;
		untrack(() => state.setPopup(popup));
		return () => state.setPopup();
	});
</script>

<Dialog.Content
	{...props}
	trapFocus={state.modal !== false}
	preventScroll={state.modal === true}
	interactOutsideBehavior="ignore"
	onOpenAutoFocus={(event) => {
		onOpenAutoFocus?.(event);
		if (!event.defaultPrevented) {
			event.preventDefault();
			ref?.focus({ preventScroll: true });
		}
	}}
	{onCloseAutoFocus}
	onEscapeKeydown={(event) => {
		onEscapeKeydown?.(event);
		if (!event.defaultPrevented) {
			event.preventDefault();
			state.requestOpen(false, "escape-key", event);
		}
	}}
	onInteractOutside={(event) => {
		onInteractOutside?.(event);
		const prevented = event.defaultPrevented;
		event.preventDefault();
		if (!prevented && !state.options.getDisablePointerDismissal()) {
			state.requestOpen(false, "outside-press", event);
		}
	}}
	onFocusOutside={(event) => {
		onFocusOutside?.(event);
		if (
			state.modal === false &&
			!state.options.getDisablePointerDismissal() &&
			!event.defaultPrevented
		) {
			state.requestOpen(false, "focus-out", event);
		}
	}}
>
	{#snippet child({ props: contentProps })}
		<div
			{...contentProps}
			bind:this={ref}
			id={props.id ?? state.popupId}
			role="dialog"
			aria-modal={state.modal === true ? "true" : undefined}
			tabindex={props.tabindex ?? -1}
			data-open={state.open ? "" : undefined}
			data-closed={!state.open ? "" : undefined}
			data-starting-style={state.starting ? "" : undefined}
			data-ending-style={state.ending ? "" : undefined}
			data-expanded={state.snapPoint === 1 ? "" : undefined}
			data-nested={state.parent ? "" : undefined}
			data-nested-drawer-open={state.nestedOpenCount > 0 ? "" : undefined}
			data-nested-drawer-swiping={state.nestedSwiping ? "" : undefined}
			data-swipe-direction={state.swipeDirection}
			data-swiping={state.swiping ? "" : undefined}
			data-swipe-dismiss={state.swipeDismissed ? "" : undefined}
			style:--drawer-swipe-movement-x={`${state.movementX}px`}
			style:--drawer-swipe-movement-y={`${state.movementY}px`}
			style:--drawer-swipe-progress={state.nestedProgress}
			style:--drawer-swipe-strength={state.swipeStrength}
			style:--drawer-snap-point-offset={`${state.swipeDirection === "up" ? -state.activeOffset : state.activeOffset}px`}
			style:--drawer-height={state.nestedPresenceCount > 0 || state.ending
				? `${state.popupHeight}px`
				: undefined}
			style:--drawer-frontmost-height={`${state.frontmostHeight}px`}
			style:--nested-drawers={state.nestedOpenCount}
			{style}
		>
			{@render children?.()}
		</div>
	{/snippet}
</Dialog.Content>
