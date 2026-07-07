<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import type { CloseProps } from "./types.js";
	import { getCtx } from "../ctx.js";

	type $$Props = CloseProps;

	export let ref: $$Props["ref"] = undefined;
	// Back-compat with upstream (bits-ui v0) API.
	// Allows `bind:el` usage in consumer code.
	export let el: HTMLElement | undefined = undefined;
	// Back-compat only; bits-ui v2 uses the `child` snippet instead.
	export let asChild: boolean = false;

	$: void asChild;

	const {
		methods: { closeDrawer },
	} = getCtx();

	$: if (el && !ref) {
		ref = el as unknown as $$Props["ref"];
	}

	function onClick(event: MouseEvent) {
		event.preventDefault();
		closeDrawer();
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			closeDrawer(true);
		}
	}
</script>

<DialogPrimitive.Close bind:ref {...$$restProps}>
	{#snippet child({ props })}
		<slot
			props={{ ...props, onclick: onClick, onkeydown: onKeydown }}
			builder={{ ...props, onclick: onClick, onkeydown: onKeydown }}
		/>
	{/snippet}
</DialogPrimitive.Close>
