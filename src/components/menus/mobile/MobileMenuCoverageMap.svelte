<script lang="ts">
	import { Drawer } from "$lib/drawer";
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
	import {
		coverageMapSnapPoints,
		coverageMapActiveSnapPoint
	} from "@/lib/features/coverageMap.svelte";
	import Fabs from "@/components/ui/fab/Fabs.svelte";
	import { page } from "$app/state";

	let contentClass = $derived(
		coverageMapActiveSnapPoint.value === coverageMapSnapPoints[coverageMapSnapPoints.length - 1]
			? "coveragemap-drawer-full"
			: "coveragemap-drawer-partial"
	);

	onMount(() => resetJustChangedMenus());
</script>

{#if page.url.pathname.startsWith("/coverage")}
	<Drawer.Root
		open={getOpenedMenu() === Menu.COVERAGE_MAP}
		onOpenChange={(open, details) => {
			if (!open) details.cancel();
		}}
		onOpenChangeComplete={onMenuDrawerOpenChangeComplete}
		modal={false}
		disablePointerDismissal
		snapPoints={coverageMapSnapPoints}
		bind:snapPoint={coverageMapActiveSnapPoint.value}
	>
		<Drawer.Portal>
			<Drawer.Viewport class="drawer-viewport">
				<Drawer.Popup
					class="drawer-popup rounded-t-xl flex flex-col px-2 py-2 w-full h-full border border-t-border bg-card/60 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
				>
					<div class="w-10 mx-auto mb-2 rounded-full bg-ring h-1 shrink-0"></div>
					<Drawer.Content
						class="{contentClass} min-h-0 flex-1 bg-background rounded-lg border border-border"
					>
						<MenuContainer />
					</Drawer.Content>
				</Drawer.Popup>
			</Drawer.Viewport>
		</Drawer.Portal>
	</Drawer.Root>
{/if}

<style>
	:global(.coveragemap-drawer-full) {
		overflow-y: auto;
	}

	:global(.coveragemap-drawer-partial) {
		overflow-y: hidden;
	}
</style>
