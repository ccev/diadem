<script lang="ts">
	import { Drawer } from 'diadem-vaul-svelte';
	import { closeMenu, getOpenedMenu, openMenu } from "@/lib/ui/menus.svelte.ts";
	import MenuContainer from "@/components/menus/MenuContainer.svelte";
	import CloseButton from "@/components/ui/CloseButton.svelte";
	import { m } from "@/lib/paraglide/messages";

	let activeSnapPoint: number = $state(0.55)
	let contentClass = $derived(activeSnapPoint === 1 ? "drawer-full" : "drawer-partial")
</script>

<Drawer.Root
	open={Boolean(getOpenedMenu())}
	onOpenChangeComplete={closeMenu}
	closeOnOutsideClick={false}
	snapPoints={[0.62, 1]}
	bind:activeSnapPoint
>
	<Drawer.Portal>
		<Drawer.Content
			class="{contentClass} duration-150! fixed flex flex-col bottom-0 z-10 px-2 pt-2 w-full h-full border border-t-border bg-card/60 backdrop-blur-sm"
		>
			<div class="sticky top-2 z-20">
				<div class="w-full py-1 flex items-center justify-between bg-card rounded-lg border border-border">
					<Drawer.Title
						level={1}
						class="font-bold text-base tracking-tight mx-4"
					>
						{#if getOpenedMenu()}
							{m['nav_' + getOpenedMenu()]()}
						{/if}

					</Drawer.Title>
					<CloseButton
						onclick={closeMenu}
						class="mr-1 hover:bg-accent/90! active:bg-accent/90!"
					/>
				</div>
			</div>

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