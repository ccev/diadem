<script lang="ts">
	import { Dialog } from "bits-ui";
	import { onDestroy, untrack } from "svelte";
	import {
		createActions,
		DrawerState,
		getOptionalDrawerContext,
		setDrawerContext,
		setOptionalDrawerContext
	} from "./context.svelte.js";
	import type { DrawerRootActions, DrawerRootProps } from "./types.js";
	import ProviderReporter from "./ProviderReporter.svelte";

	let {
		children,
		open = $bindable(),
		defaultOpen = false,
		onOpenChange,
		onOpenChangeComplete,
		modal = true,
		disablePointerDismissal = false,
		closeOnOutsideClick = true,
		swipeDirection = "down",
		snapPoints,
		snapPoint = $bindable(),
		defaultSnapPoint,
		onSnapPointChange,
		snapToSequentialPoints = false,
		actionsRef = $bindable(null),
		handle
	}: DrawerRootProps = $props();

	if (open === undefined) open = untrack(() => defaultOpen);
	if (snapPoint === undefined) {
		snapPoint = untrack(() => defaultSnapPoint ?? snapPoints?.[0] ?? null);
	}
	let previousOpen = untrack(() => open ?? false);
	const parent = getOptionalDrawerContext();
	const id = $props.id();
	const state = new DrawerState(
		id,
		{
			getOpen: () => open ?? false,
			setOpen: (value) => (open = value),
			getModal: () => modal,
			getDisablePointerDismissal: () => disablePointerDismissal || !closeOnOutsideClick,
			getSwipeDirection: () => swipeDirection,
			getSnapPoints: () => snapPoints,
			getSnapPoint: () => snapPoint,
			setSnapPoint: (value) => (snapPoint = value),
			getDefaultSnapPoint: () => defaultSnapPoint ?? snapPoints?.[0] ?? null,
			getSequential: () => snapToSequentialPoints,
			onOpenChange: (value, details) => onOpenChange?.(value, details),
			onSnapPointChange: (value, details) => onSnapPointChange?.(value, details)
		},
		parent
	);
	setDrawerContext(state);
	setOptionalDrawerContext(state);
	actionsRef = createActions(state);

	$effect(() => {
		if (!handle) return;
		const currentHandle = handle;
		currentHandle.state = state;
		return () => {
			if (currentHandle.state === state) currentHandle.state = undefined;
		};
	});

	$effect(() => {
		void snapPoints;
		void snapPoint;
		if (state.popup) untrack(() => state.resolveSnapPoints());
	});

	$effect(() => {
		const currentOpen = open ?? false;
		if (currentOpen !== previousOpen) {
			previousOpen = currentOpen;
			untrack(() => state.syncOpen(currentOpen));
		} else if (currentOpen) {
			state.mounted = true;
		}
	});

	onDestroy(() => {
		state.destroy();
	});

	function setDialogOpen(value: boolean) {
		if (value !== open) state.requestOpen(value);
	}

	function complete(value: boolean) {
		state.complete(value);
		onOpenChangeComplete?.(value);
	}
</script>

<Dialog.Root bind:open={() => open ?? false, setDialogOpen} onOpenChangeComplete={complete}>
	<ProviderReporter />
	{@render children?.()}
</Dialog.Root>
