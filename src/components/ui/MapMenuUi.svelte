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
	<div
		class="fixed inset-0 z-10 flex items-end overflow-hidden pt-safe-inset-top pb-safe-inset-bottom pointer-events-none"
	>
		<div
			class="mr-auto flex h-full min-w-[17rem] max-w-104 flex-[1_1_26rem] flex-col items-start justify-end gap-2"
		>
			{@render desktopLeft?.()}
		</div>

		<div class="flex h-full shrink-0 flex-col items-end justify-end">
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
