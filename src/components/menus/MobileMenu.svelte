<script lang="ts">
	import { slide } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { getOpenedMenu, openMenu } from '@/lib/ui/menus.svelte.js';
	import MenuContainer from '@/components/menus/MenuContainer.svelte';
	import CloseButton from '@/components/ui/CloseButton.svelte';
	import * as m from '@/lib/paraglide/messages';
	import { Drawer } from 'diadem-vaul-svelte';

	type OpenedMenu = ReturnType<typeof getOpenedMenu>;

	const isMobileWebkit =
		browser &&
		(/iPad|iPhone|iPod/.test(navigator.userAgent) ||
			(navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1));

	let open = $state(false);
	let renderedMenu: OpenedMenu = $state(null);
	let lastMenu: OpenedMenu = $state(null);
	let closeTimer: ReturnType<typeof setTimeout> | null = null;

	const isScout = $derived(renderedMenu === 'scout');

	function finalizeClose() {
		if (closeTimer) {
			clearTimeout(closeTimer);
			closeTimer = null;
		}
		renderedMenu = null;
		openMenu(null);
	}

	function requestClose() {
		open = false;

		// Fallback: if `onOpenChangeComplete` doesn't fire reliably, still clear state after the close transition.
		if (closeTimer) clearTimeout(closeTimer);
		closeTimer = setTimeout(() => {
			finalizeClose();
		}, 600);
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
			class={`after:h-0! duration-150! touch-auto! fixed z-10 w-full h-full overflow-y-scroll bottom-0 ${
				isMobileWebkit ? 'pointer-events-none' : 'pointer-events-none!'
			} overscroll-contain`}
			style="{isScout ? 'height: fit-content !important;' : '' }; -webkit-overflow-scrolling: touch; touch-action: pan-y;"
		>
			<div
				class={`pb-20 px-2 pt-2 rounded-t-xl border border-t-border bg-card/60 backdrop-blur-sm pointer-events-auto ${
					isScout ? '' : 'mt-40 min-h-full'
				}`}
				out:slide={{ duration: 70, axis: 'y' }}
			>
				<div class="sticky top-2 z-20">
					<div class="w-full py-1 flex items-center justify-between bg-card/60 backdrop-blur-sm rounded-lg border border-border">
						<Drawer.Title
							level="h1"
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
