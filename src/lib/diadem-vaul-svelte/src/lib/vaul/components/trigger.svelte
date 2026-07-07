<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { getCtx } from "../ctx.js";

	type $$Props = DialogPrimitive.TriggerProps;

	const {
		refs: { triggerRef },
	} = getCtx();

	export let ref: $$Props["ref"] = undefined;
	// Back-compat with upstream (bits-ui v0) API.
	// Allows `bind:el` usage in consumer code.
	export let el: HTMLButtonElement | undefined = undefined;
	// Back-compat only; bits-ui v2 uses the `child` snippet instead.
	export let asChild: boolean = false;

	$: void asChild;

	$: if (el && !ref) {
		ref = el as unknown as $$Props["ref"];
	}

	$: triggerRef.set((ref as HTMLButtonElement | null) ?? el ?? undefined);
</script>

<DialogPrimitive.Trigger bind:ref {...$$restProps}>
	{#snippet child({ props })}
		<slot {props} builder={props} />
	{/snippet}
</DialogPrimitive.Trigger>
