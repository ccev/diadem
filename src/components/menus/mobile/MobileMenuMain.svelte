<script lang="ts">
	import { Drawer } from "diadem-vaul-svelte";
	import {
		closeMenu,
		getOpenedMenu,
		Menu,
		onMenuDrawerOpenChangeComplete,
		resetJustChangedMenus
	} from "@/lib/ui/menus.svelte";
	import MenuContainer from "@/components/menus/MenuContainer.svelte";
	import MobileTitle from "@/components/menus/mobile/MobileTitle.svelte";
	import { onMount } from "svelte";

	let {
		menus,
	}: {
		menus: (Menu | null)[]
	} = $props();

	const snapPoints = [0.62, 1];
	let initialSnapPoint = 0;

	let activeSnapPoint: number | string = $state(snapPoints[initialSnapPoint]);
	let contentClass = $derived(activeSnapPoint === snapPoints[snapPoints.length - 1] ? "drawer-full" : "drawer-partial");

	onMount(() => resetJustChangedMenus());
</script>

<Drawer.Root
	open={menus.includes(getOpenedMenu())}
	onOpenChangeComplete={onMenuDrawerOpenChangeComplete}
	closeOnOutsideClick={false}
	{snapPoints}
	bind:activeSnapPoint
>
	<Drawer.Portal>
		<Drawer.Content
			class="{contentClass} duration-150! fixed flex flex-col bottom-0 z-10 px-2 pt-2 w-full h-full border border-t-border bg-card/60 backdrop-blur-sm"
		>
			<MobileTitle />

			<div
				class="pb-20 content"
			>
				<MenuContainer />
			</div>
		</Drawer.Content>
	</Drawer.Portal>
</Drawer.Root>

<style>
    :global(.drawer-full) {
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