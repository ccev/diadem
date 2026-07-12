<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";
	import { getOptionalDrawerContext } from "./context.svelte.js";
	import type { DrawerHandle } from "./handle.js";

	let {
		children,
		disabled = false,
		ref = $bindable(),
		onclick,
		handle,
		payload,
		...props
	}: HTMLButtonAttributes & {
		children?: Snippet;
		ref?: HTMLButtonElement;
		handle?: DrawerHandle;
		payload?: unknown;
	} = $props();
	const localState = getOptionalDrawerContext();
	let state = $derived(handle?.state ?? localState);
</script>

<button
	bind:this={ref}
	{...props}
	type={props.type ?? "button"}
	{disabled}
	data-open={state?.open ? "" : undefined}
	data-closed={!state?.open ? "" : undefined}
	data-disabled={disabled ? "" : undefined}
	aria-controls={state?.popupId}
	aria-expanded={state?.open ?? false}
	onclick={(event) => {
		onclick?.(event);
		if (!event.defaultPrevented) {
			if (!state) return;
			if (handle) handle.payload = payload;
			state.trigger = event.currentTarget;
			state.requestOpen(!state.open, "trigger-press", event, event.currentTarget);
		}
	}}
>
	{@render children?.()}
</button>
