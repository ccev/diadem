<script lang="ts">
	import { Menu } from "@/lib/ui/menus.svelte";
	import MobileMenuMain from "@/components/menus/mobile/MobileMenuMain.svelte";
	import MobileMenuStatic from "@/components/menus/mobile/MobileMenuStatic.svelte";
	import MobileMenuCoverageMap from "@/components/menus/mobile/MobileMenuCoverageMap.svelte";
</script>

<MobileMenuMain menus={[Menu.FILTERS, Menu.PROFILE, Menu.TOOLS]} />
<MobileMenuCoverageMap />
<MobileMenuStatic menus={[Menu.SCOUT]} />