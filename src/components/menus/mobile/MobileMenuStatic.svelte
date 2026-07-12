<script lang="ts">
	import { Drawer } from "$lib/drawer";
	import {
		getOpenedMenu,
		Menu,
		onMenuDrawerOpenChangeComplete,
		resetJustChangedMenus
	} from "@/lib/ui/menus.svelte";
	import MenuContainer from "@/components/menus/MenuContainer.svelte";
	import MobileTitle from "@/components/menus/mobile/MobileTitle.svelte";
	import { onMount } from "svelte";

	let {
		menus
	}: {
		menus: (Menu | null)[];
	} = $props();

	onMount(() => {
		resetJustChangedMenus();
	});
</script>

<Drawer.Root
	open={menus.includes(getOpenedMenu())}
	onOpenChangeComplete={onMenuDrawerOpenChangeComplete}
	modal={false}
	disablePointerDismissal
>
	<Drawer.Portal>
		<Drawer.Viewport class="drawer-viewport flex items-end z-0!">
			<Drawer.Popup
				class="drawer-popup flex flex-col px-2 pt-2 w-full h-fit border border-t-border bg-card/60 backdrop-blur-sm rounded-t-xl pb-[env(safe-area-inset-bottom)]"
			>
				<MobileTitle />
				<Drawer.Content class="pb-20 content">
					<MenuContainer />
				</Drawer.Content>
			</Drawer.Popup>
		</Drawer.Viewport>
	</Drawer.Portal>
</Drawer.Root>

<!--<style>-->
<!--	:global(.drawer-viewport) {-->
<!--		position: fixed;-->
<!--		inset: 0;-->
<!--		z-index: 10;-->
<!--		display: flex;-->
<!--		align-items: flex-end;-->
<!--		pointer-events: none;-->
<!--	}-->
<!--	:global(.drawer-popup) {-->
<!--		pointer-events: auto;-->
<!--		outline: none;-->
<!--		will-change: transform;-->
<!--		transform: translateY(calc(var(&#45;&#45;drawer-snap-point-offset) + var(&#45;&#45;drawer-swipe-movement-y)));-->
<!--		transition: transform 300ms cubic-bezier(0.22, 0.61, 0.36, 1);-->
<!--	}-->
<!--	:global(.drawer-popup[data-swiping]) {-->
<!--		transition-duration: 0ms;-->
<!--		user-select: none;-->
<!--	}-->
<!--	:global(.drawer-popup[data-starting-style]),-->
<!--	:global(.drawer-popup[data-ending-style]) {-->
<!--		transform: translateY(100%) !important;-->
<!--		transition-duration: 120ms;-->
<!--	}-->
<!--</style>-->
