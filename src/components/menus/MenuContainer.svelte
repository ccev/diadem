<script module lang="ts">
	import ProfileMenu from "@/components/menus/profile/ProfileMenu.svelte";
	import { getOpenedMenu, Menu } from "@/lib/ui/menus.svelte.js";
	import FiltersMenu from "@/components/menus/filters/FiltersMenu.svelte";
	import ScoutMenu from "@/components/menus/scout/ScoutMenu.svelte";
	import ToolsMenu from "@/components/menus/tools/ToolsMenu.svelte";
	import CoverageMapMenu from "@/components/menus/coverageMap/CoverageMapMenu.svelte";

	let MenuElement = $derived.by(() => {
		switch(getOpenedMenu()) {
			case Menu.PROFILE:
				return ProfileMenu
			case Menu.FILTERS:
				return FiltersMenu
			case Menu.SCOUT:
				return ScoutMenu
			case Menu.TOOLS:
				return ToolsMenu
			case Menu.COVERAGE_MAP:
				return CoverageMapMenu
		}
	})
</script>

<MenuElement />