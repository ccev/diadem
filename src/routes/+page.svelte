<script lang="ts">
	import { slide } from 'svelte/transition';
	import PokemonPopup from '@/components/ui/popups/pokemon/PokemonPopup.svelte';
	import PokestopPopup from '@/components/ui/popups/pokestop/PokestopPopup.svelte';
	import LocateFab from '@/components/ui/fab/LocateFab.svelte';
	import BottomNav from '@/components/ui/nav/BottomNav.svelte';
	import { getUserSettings } from '@/lib/userSettings.svelte';
	import Map from '@/components/map/Map.svelte';
	import ContextMenu from '@/components/ui/contextmenu/ContextMenu.svelte';
	import { getConfig } from '@/lib/config/config';
	import GymPopup from '@/components/ui/popups/gym/GymPopup.svelte';
	import StationPopup from '@/components/ui/popups/station/StationPopup.svelte';
	import { getCurrentSelectedData, getCurrentSelectedMapId } from '@/lib/mapObjects/currentSelectedState.svelte';
	import { getMap, resetMap } from '@/lib/map/map.svelte';
	import WeatherOverview from '@/components/map/WeatherOverview.svelte';
	import { Search as SearchIcon } from 'lucide-svelte';
	import Search from '@/components/ui/search/Search.svelte';
	import { openModal } from '@/lib/modal.svelte';
	import BaseFab from '@/components/ui/fab/BaseFab.svelte';
	import { isSupportedFeature } from '@/lib/enabledFeatures';
	import { getUserDetails } from '@/lib/user/userDetails.svelte.js';
	import SignInButton from '@/components/ui/user/SignInButton.svelte';
	import { getOpenedMenu, isMenuSidebar, isUiLeft, openMenu } from '@/lib/menus.svelte';
	import ProfileMenu from '@/components/menus/profile/ProfileMenu.svelte';
	import FiltersMenu from '@/components/menus/filters/FiltersMenu.svelte';
	import Fabs from '@/components/ui/fab/Fabs.svelte';
	import PopupContainer from '@/components/ui/popups/PopupContainer.svelte';
	import { innerWidth } from "svelte/reactivity/window";
	import MenuContainer from '@/components/menus/MenuContainer.svelte';
	import CloseButton from '@/components/ui/CloseButton.svelte';
	import MobileMenu from '@/components/menus/MobileMenu.svelte';
	import DesktopMenu from '@/components/menus/DesktopMenu.svelte';

	let showSignInButton = $derived(isSupportedFeature("auth") && !getUserDetails().details)

	function onmapclick() {
		resetMap()
	}

	$effect(() => {
		// When opening a popup on mobile while in a menu, close the menu
		if (getCurrentSelectedData() && !isMenuSidebar()) {
			openMenu(null)
		}
	})
</script>

<svelte:head>
	<title>{getConfig().general.mapName}</title>
</svelte:head>

<ContextMenu />

{#if showSignInButton}
	<div class="fixed top-2 z-10 left-1/2 -translate-x-1/2">
		<SignInButton />
	</div>
{/if}

<!--{#if getOpenedMenu()}-->
<!--	<div class="fixed top-2 left-2 bottom-20 pb-2 z-10 max-w-[26rem] overflow-y-auto max-h-full rounded-lg ">-->
<!--		{#if showSignInButton}-->
<!--			<div class="h-11"></div>-->
<!--		{/if}-->
<!--		{#if getOpenedMenu() === "profile"}-->
<!--			profile-->
<!--			<ProfileMenu />-->
<!--		{:else if getOpenedMenu() === "filters"}-->
<!--			filters-->
<!--			<FiltersMenu />-->
<!--		{/if}-->
<!--	</div>-->

<!--{/if}-->

<WeatherOverview />

{#if isMenuSidebar()}
	<div
		class="fixed z-10 bottom-2 w-full flex pointer-events-none items-end h-full"
	>
		<div class="mr-auto flex flex-col items-start justify-end h-full gap-2 shrink basis-104 max-w-104 min-w-88">
			{#if getOpenedMenu()}
				<DesktopMenu />
			{/if}
			<BottomNav />
		</div>

		<div class="flex flex-col items-end gap-2 w-[30rem] shrink basis-120">
			<Fabs />
			<PopupContainer />
		</div>
	</div>
{:else}
	<MobileMenu />

	<div
		class="fixed z-20 bottom-2 w-full flex flex-col pointer-events-none gap-2"
		class:items-end={!isUiLeft()}
		class:items-start={isUiLeft()}
	>
		{#if !getOpenedMenu()}
			<Fabs />
			<PopupContainer />
		{/if}
		<BottomNav />
	</div>
{/if}

<Map />
