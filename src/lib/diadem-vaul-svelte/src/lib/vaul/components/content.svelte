<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import type { ContentProps } from "./types.js";
	import { get } from "svelte/store";
	import { getCtx } from "../ctx.js";
	import Visible from "./visible.svelte";

	type $$Props = ContentProps;

	const {
		refs: { drawerRef },
		states: { visible, keyboardIsOpen, openDrawerIds, drawerId },
		helpers: { getContentStyle },
		methods: { onPress, onDrag, onRelease, closeDrawer },
		options: { direction, dismissible: localDismissible },
		rootProps: { closeOnOutsideClick = true, onOutsideClick, onOpenChange, openFocus } = {},
	} = getCtx();

	export let style: $$Props["style"] = "";

	let drawerEl: HTMLDivElement | null = null;

	$: drawerRef.set(drawerEl ?? undefined);
</script>

<DialogPrimitive.Content
	style={$getContentStyle(style)}
	preventScroll={false}
	onOpenAutoFocus={openFocus}
	onEscapeKeydown={(e) => {
		e.preventDefault();
	}}
	onInteractOutside={(e) => {
		if (!closeOnOutsideClick) {
			e.preventDefault();
			return;
		}

		onOutsideClick?.(e);

		if (e?.defaultPrevented) return;

		if ($keyboardIsOpen) {
			keyboardIsOpen.set(false);
		}
		e.preventDefault();
		if (!$localDismissible) {
			return;
		}
		const $openDialogIds = get(openDrawerIds);
		const isLast = $openDialogIds[$openDialogIds.length - 1] === get(drawerId);
		if (isLast) {
			onOpenChange?.(false);
			closeDrawer();
		}
	}}
	{...$$restProps}
>
	{#snippet child({ props })}
		<div
			{...props}
			bind:this={drawerEl}
			on:pointerdown={(e) => {
				onPress(e);
			}}
			on:pointerup={(e) => {
				onRelease(e);
			}}
			on:pointermove={(e) => {
				onDrag(e);
			}}
			on:touchend={(e) => {
				onRelease(e);
			}}
			on:touchmove={(e) => {
				onDrag(e);
			}}
			data-vaul-drawer=""
			data-vaul-drawer-direction={$direction}
			data-vaul-drawer-visible={$visible ? "true" : "false"}
		>
			<Visible />
			<slot />
		</div>
	{/snippet}
</DialogPrimitive.Content>
