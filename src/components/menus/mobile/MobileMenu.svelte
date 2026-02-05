<script lang="ts">
	import { Drawer } from 'diadem-vaul-svelte';
	import { closeMenu, getOpenedMenu, Menu, openMenu } from "@/lib/ui/menus.svelte.ts";
	import MenuContainer from "@/components/menus/MenuContainer.svelte";
	import CloseButton from "@/components/ui/CloseButton.svelte";
	import { m } from "@/lib/paraglide/messages";
	import MobileMenuMain from "@/components/menus/mobile/MobileMenuMain.svelte";
	import MobileMenuStatic from "@/components/menus/mobile/MobileMenuStatic.svelte";

	let menu = $derived(getOpenedMenu())
</script>

<MobileMenuMain menus={[Menu.FILTERS, Menu.PROFILE]} />

<MobileMenuStatic menus={[Menu.SCOUT]} />