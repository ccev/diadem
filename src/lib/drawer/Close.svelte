<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";
	import { getDrawerContext } from "./context.svelte.js";

	let {
		children,
		disabled = false,
		ref = $bindable(),
		onclick,
		...props
	}: HTMLButtonAttributes & {
		children?: Snippet;
		ref?: HTMLButtonElement;
	} = $props();
	const state = getDrawerContext();
</script>

<button
	bind:this={ref}
	{...props}
	type={props.type ?? "button"}
	{disabled}
	data-disabled={disabled ? "" : undefined}
	onclick={(event) => {
		onclick?.(event);
		if (!event.defaultPrevented)
			state.requestOpen(false, "close-press", event, event.currentTarget);
	}}
>
	{@render children?.()}
</button>
