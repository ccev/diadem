<script lang="ts">
	import { Drawer } from 'diadem-vaul-svelte';
	import { closeMenu, getOpenedMenu, Menu } from "@/lib/ui/menus.svelte.ts";
	import MenuContainer from "@/components/menus/MenuContainer.svelte";
	import MobileTitle from "@/components/menus/mobile/MobileTitle.svelte";

	let {
		menus
	}: {
		menus: (Menu | null)[]
	} = $props()

</script>

<Drawer.Root
	open={menus.includes(getOpenedMenu())}
	onOpenChangeComplete={closeMenu}
	closeOnOutsideClick={false}
>
	<Drawer.Portal>
		<Drawer.Content
			class="duration-150! fixed flex flex-col bottom-0 z-10 px-2 pt-2 w-full h-fit border border-t-border bg-card/60 backdrop-blur-sm rounded-t-xl"
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
