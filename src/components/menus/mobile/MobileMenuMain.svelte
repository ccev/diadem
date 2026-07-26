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

	const snapPoints = [0.62, 1];
	let initialSnapPoint = 0;

	let snapPoint: number | string | null = $state(snapPoints[initialSnapPoint]);
	let contentClass = $derived(
		snapPoint === snapPoints[snapPoints.length - 1] ? "drawer-full" : "drawer-partial"
	);

	onMount(() => resetJustChangedMenus());
</script>

<Drawer.Root
	open={menus.includes(getOpenedMenu())}
	onOpenChangeComplete={onMenuDrawerOpenChangeComplete}
	modal={false}
	disablePointerDismissal
	{snapPoints}
	bind:snapPoint
>
	<Drawer.Portal>
		<Drawer.Viewport class="z-20 drawer-viewport">
			<Drawer.Popup
				class="drawer-popup {contentClass} flex flex-col w-full h-full pb-[env(safe-area-inset-bottom)]"
			>
				<MobileTitle />
				<Drawer.Content class="pb-20 content min-h-0 flex-1 px-2 bg-card/60 backdrop-blur-sm pt-3">
					<MenuContainer />
				</Drawer.Content>
			</Drawer.Popup>
		</Drawer.Viewport>
	</Drawer.Portal>
</Drawer.Root>

<style>
	:global(.drawer-full) {
		/* Only inset for the status bar when the drawer is expanded to the top;
		   at the partial snap point it sits below the status bar already. */
		padding-top: calc(0.5rem + env(safe-area-inset-top)) !important;

		& .content {
			overflow-y: auto;
		}
	}

	:global(.drawer-partial) {
		border-top-left-radius: calc(var(--radius) + 4px);
		border-top-right-radius: calc(var(--radius) + 4px);

		& .content {
			overflow-y: hidden;
		}
	}
</style>
