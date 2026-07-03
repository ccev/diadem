<script lang="ts">
	import { getIsContextMenuOpen } from "@/lib/ui/contextmenu.svelte.js";
	import { isMenuSidebar, isUiLeft } from "@/lib/utils/device";
	import MobileMenu from "@/components/menus/mobile/MobileMenu.svelte";
	import type { Snippet } from "svelte";

	let {
		desktopRight,
		desktopRightSidebar,
		desktopLeft,
		mobileBottom,
		mobileTop
	}: {
		desktopRight?: Snippet;
		desktopRightSidebar?: Snippet;
		desktopLeft?: Snippet;
		mobileBottom?: Snippet;
		mobileTop?: Snippet;
	} = $props();
</script>

{#if isMenuSidebar()}
	<div class="fixed w-full h-full z-10 pb-safe-inset-bottom pt-safe-inset-top pointer-events-none flex items-end">
		<div
			class="mr-auto flex flex-col items-start justify-end h-full gap-2 shrink min-w-70 w-full max-w-104"
		>
			{@render desktopLeft?.()}
		</div>

		<div class="h-full flex flex-col justify-end items-end">
			{@render desktopRight?.()}
		</div>

		{@render desktopRightSidebar?.()}

	</div>
{:else if !getIsContextMenuOpen()}
	<MobileMenu />

	<div
		class="fixed z-20 bottom-safe-inset-bottom w-full flex flex-col pointer-events-none gap-2"
		class:items-end={!isUiLeft()}
		class:items-start={isUiLeft()}
	>
		{@render mobileBottom?.()}
	</div>

	{@render mobileTop?.()}
{/if}
