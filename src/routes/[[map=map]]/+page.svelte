<script lang="ts">
	import BottomNav from "@/components/ui/BottomNav.svelte";
	import Map from "@/components/map/Map.svelte";
	import ContextMenu from "@/components/ui/contextmenu/ContextMenu.svelte";
	import { getConfig } from "@/lib/services/config/config";
	import { getCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte.js";
	import WeatherOverview from "@/components/map/WeatherOverview.svelte";
	import { isSupportedFeature } from "@/lib/services/supportedFeatures";
	import { getUserDetails } from "@/lib/services/user/userDetails.svelte.js";
	import SignInButton from "@/components/ui/user/SignInButton.svelte";
	import { getOpenedMenu, openMenu } from "@/lib/ui/menus.svelte.js";
	import Fabs from "@/components/ui/fab/Fabs.svelte";
	import PopupContainer from "@/components/ui/popups/PopupContainer.svelte";
	import MobileMenu from "@/components/menus/MobileMenu.svelte";
	import DesktopMenu from "@/components/menus/DesktopMenu.svelte";
	import { hasLoadedFeature, LoadedFeature } from "@/lib/services/initialLoad.svelte.js";
	import Metadata from "@/components/utils/Metadata.svelte";
	import { getIsContextMenuOpen } from "@/lib/ui/contextmenu.svelte.js";
	import { isMenuSidebar, isUiLeft } from "@/lib/utils/device";
	import { page } from "$app/state";
	import Home from "@/components/custom/Home.svelte";

	let showSignInButton = $derived(
		hasLoadedFeature(LoadedFeature.SUPPORTED_FEATURES, LoadedFeature.USER_DETAILS)
		&& isSupportedFeature("auth")
		&& !getUserDetails().details
	)

	$effect(() => {
		// When opening a popup on mobile while in a menu, close the menu
		if (getCurrentSelectedData() && !isMenuSidebar()) {
			openMenu(null)
		}
	})

	let showCustomHome = $derived(getConfig().general.customHome && page.params.map !== "map")
</script>

<svelte:head>
	<Metadata />
</svelte:head>

{#if showCustomHome}
	<Home />
{:else}
	<ContextMenu />

	{#if showSignInButton}
		<div class="fixed top-2 z-10 left-1/2 -translate-x-1/2">
			<SignInButton />
		</div>
	{/if}

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

			<div class="flex flex-col items-end gap-2 w-120 shrink basis-120">
				<Fabs />
				<PopupContainer />
			</div>
		</div>
	{:else if !getIsContextMenuOpen()}
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
{/if}


