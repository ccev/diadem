<script lang="ts">
	import { getOpenedMenu, Menu } from "@/lib/ui/menus.svelte.js";
	import ProfileMenu from '@/components/menus/profile/ProfileMenu.svelte';
	import FiltersMenu from '@/components/menus/filters/FiltersMenu.svelte';
	import { slide } from 'svelte/transition';
	import ScoutMenu from '@/components/menus/scout/ScoutMenu.svelte';
	import ToolsMenu from "@/components/menus/tools/ToolsMenu.svelte";
	import CoverageMapMenu from "@/components/menus/coverageMap/CoverageMapMenu.svelte";
</script>

{#if getOpenedMenu() === Menu.PROFILE}
	<ProfileMenu />
{:else if getOpenedMenu() === Menu.FILTERS}
	<FiltersMenu />
{:else if getOpenedMenu() === Menu.SCOUT}
	<ScoutMenu />
{:else if getOpenedMenu() === Menu.TOOLS}
	<ToolsMenu />
{:else if getOpenedMenu() === Menu.COVERAGE_MAP}
	<CoverageMapMenu />
{/if}