<script lang="ts">
	import { Drawer } from 'diadem-vaul-svelte';
	import { closeMenu, getOpenedMenu, Menu, openMenu } from "@/lib/ui/menus.svelte.ts";
	import MenuContainer from "@/components/menus/MenuContainer.svelte";
	import MobileTitle from "@/components/menus/mobile/MobileTitle.svelte";

	let {
		menus
	}: {
		menus: (Menu | null)[]
	} = $props()

	let activeSnapPoint: number = $state(0.55)
	let contentClass = $derived(activeSnapPoint === 1 ? "drawer-full" : "drawer-partial")
</script>

<Drawer.Root
	open={menus.includes(getOpenedMenu())}
	onOpenChangeComplete={closeMenu}
	closeOnOutsideClick={false}
	snapPoints={[0.62, 1]}
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