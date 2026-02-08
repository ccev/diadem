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
	import { coverageMapSnapPoints, coverageMapActiveSnapPoint } from "@/lib/features/coverageMap.svelte";

	let contentClass = $derived(coverageMapActiveSnapPoint.value === coverageMapSnapPoints[coverageMapSnapPoints.length - 1] ? "coveragemap-drawer-full" : "coveragemap-drawer-partial");

	onMount(() => resetJustChangedMenus());
</script>

<Drawer.Root
	open={getOpenedMenu() === Menu.COVERAGE_MAP}
	onOpenChangeComplete={onMenuDrawerOpenChangeComplete}
	closeOnOutsideClick={false}
	dismissible={false}
	snapPoints={coverageMapSnapPoints}
	bind:activeSnapPoint={coverageMapActiveSnapPoint.value}
>
	<Drawer.Portal>
		<Drawer.Content
			class="duration-150! rounded-t-xl fixed flex flex-col bottom-0 z-10 px-2 py-2 w-full h-full border border-t-border bg-card/60 backdrop-blur-sm"
		>
			<div class="w-10 mx-auto mb-2 rounded-full bg-ring h-6"></div>
			<div class="{contentClass}" >
				<MenuContainer />
			</div>
		</Drawer.Content>
	</Drawer.Portal>
</Drawer.Root>

<style>
    :global(.coveragemap-drawer-full) {
		overflow-y: auto;
    }

    :global(.coveragemap-drawer-partial) {
		overflow-y: hidden;
    }
</style>