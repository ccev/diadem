<script lang="ts">
	import { getIsContextMenuOpen } from "@/lib/ui/contextmenu.svelte.js";
	import { isMenuSidebar, isUiLeft } from "@/lib/utils/device";
	import MobileMenu from "@/components/menus/mobile/MobileMenu.svelte";
	import type { Snippet } from "svelte";

	let {
		desktopRight,
		desktopLeft,
		mobileBottom,
		mobileTop
	}: {
		desktopRight?: Snippet;
		desktopLeft?: Snippet;
		mobileBottom?: Snippet;
		mobileTop?: Snippet;
	} = $props();
</script>

{#if isMenuSidebar()}
	<div class="fixed z-10 bottom-2 w-full flex pointer-events-none items-end h-full">
		<div
			class="mr-auto flex flex-col items-start justify-end h-full gap-2 shrink basis-104 max-w-104 min-w-88"
		>
			{@render desktopLeft?.()}
		</div>

		<div class="flex flex-col items-end gap-2 w-120 shrink basis-120">
			{@render desktopRight?.()}
		</div>
	</div>
{:else if !getIsContextMenuOpen()}
	<MobileMenu />

	<div
		class="fixed z-20 bottom-2 w-full flex flex-col pointer-events-none gap-2"
		class:items-end={!isUiLeft()}
		class:items-start={isUiLeft()}
	>
		{@render mobileBottom?.()}
	</div>

	{@render mobileTop?.()}
{/if}
