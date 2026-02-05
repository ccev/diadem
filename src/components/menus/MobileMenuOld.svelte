<script lang="ts">
	import { slide } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { getOpenedMenu, type MenuTypes, openMenu } from "@/lib/ui/menus.svelte.js";
	import MenuContainer from '@/components/menus/MenuContainer.svelte';
	import CloseButton from '@/components/ui/CloseButton.svelte';
	import * as m from '@/lib/paraglide/messages';
	import { Drawer } from 'diadem-vaul-svelte';
	import { isMobileWebKit } from "@/lib/utils/device";

	let open = $state(false);
	let renderedMenu: MenuTypes = $state(null);
	let lastMenu: MenuTypes = $state(null);
	let closeTimer: ReturnType<typeof setTimeout> | null = null;

	const isScout = $derived(renderedMenu === 'scout');

	let contentClasses = $derived.by(() => {
		let contentClasses = ""
		if (isMobileWebKit()) {
			contentClasses += "drawer-content-mobile-webkit "
		} else {
			contentClasses += "drawer-content-normal "
		}

		if (isScout) {
			contentClasses += "drawer-content-scout "
		}
		return contentClasses
	})

	let containerClasses = $derived(isScout ? ".drawer-container-scout" : "")

	function finalizeClose() {
		if (closeTimer) {
			clearTimeout(closeTimer);
			closeTimer = null;
		}
		renderedMenu = null;
		openMenu(null);
	}

	function requestClose() {
		finalizeClose()
		open = false;

		// Fallback: if `onOpenChangeComplete` doesn't fire reliably, still clear state after the close transition.
		// if (closeTimer) clearTimeout(closeTimer);
		// closeTimer = setTimeout(() => {
		// 	finalizeClose();
		// }, 600);
	}

	$effect(() => {
		const menu = getOpenedMenu();
		if (menu === lastMenu) return;

		lastMenu = menu;

		if (menu) {
			if (closeTimer) {
				clearTimeout(closeTimer);
				closeTimer = null;
			}
			renderedMenu = menu;
			open = true;
		} else {
			if (open) requestClose();
			else renderedMenu = null;
		}
	});
</script>

<Drawer.Root
	open={open}
	onOpenChange={(next) => {
		open = next;
		if (!next) requestClose();
	}}
	onOpenChangeComplete={(next) => {
		if (!next) finalizeClose();
	}}
	closeOnOutsideClick={false}
>
	<Drawer.Portal>
		<Drawer.Content
			class="{contentClasses} after:h-0! duration-150! touch-auto! fixed z-10 w-full h-full overflow-y-scroll bottom-0 overscroll-contain"
			style="-webkit-overflow-scrolling: touch; touch-action: pan-y;"
		>
			<div
				class="{containerClasses} pb-20 px-2 pt-2 rounded-t-xl border border-t-border bg-card/60 backdrop-blur-sm pointer-events-auto"
				out:slide={{ duration: 70, axis: 'y' }}
			>
				<div class="sticky top-2 z-20">
					<div class="w-full py-1 flex items-center justify-between bg-card/60 backdrop-blur-sm rounded-lg border border-border">
						<Drawer.Title
							level={1}
							class="font-bold text-base tracking-tight mx-4"
						>
							{renderedMenu ? m['nav_' + renderedMenu]() : ''}
						</Drawer.Title>
						<CloseButton
							onclick={requestClose}
							class="mr-1 hover:bg-accent/90! active:bg-accent/90!"
						/>
					</div>
				</div>

				<MenuContainer />
			</div>
		</Drawer.Content>
	</Drawer.Portal>
</Drawer.Root>

<style>
    :global(.drawer-content-mobile-webkit) {
		pointer-events: none !important;
	}

    :global(.drawer-content-normal) {
		pointer-events: none;
	}

	:global(.drawer-content-scout) {
        height: fit-content !important;
	}

	:global(.drawer-container-scout) {
        margin-top: calc(var(--spacing) * 40);
        min-height: 100%;
	}
</style>