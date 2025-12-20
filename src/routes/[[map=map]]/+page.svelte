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
	import { isWebglSupported } from "@/lib/map/utils";
	import ErrorPage from "@/components/ui/ErrorPage.svelte";
	import * as m from "@/lib/paraglide/messages";
	import Button from "@/components/ui/input/Button.svelte";
	import DiscordIcon from "@/components/icons/DiscordIcon.svelte";
	import QuestFilterset from "@/components/menus/filters/filterset/quest/QuestFilterset.svelte";
	import RaidFilterset from "@/components/menus/filters/filterset/raid/RaidFilterset.svelte";
	import PokemonFilterset from "@/components/menus/filters/filterset/pokemon/PokemonFilterset.svelte";

	$effect(() => {
		// When opening a popup on mobile while in a menu, close the menu
		if (getCurrentSelectedData() && !isMenuSidebar()) {
			openMenu(null)
		}
	})

	let showCustomHome = $derived(getConfig().general.customHome && page.params.map !== "map")
	const errorHref = getConfig().general.customHome ? '/' : ''
</script>

<svelte:head>
	<Metadata />
</svelte:head>

{#if showCustomHome}
	<Home />
{:else if !isWebglSupported()}
	<ErrorPage
		error={m.error_webgl_unavailable()}
		description={isWebglSupported() === null ? m.webgl_disabled_error() : m.webgl_unsupported_error()}
		href={errorHref}
	/>
{:else if hasLoadedFeature(LoadedFeature.SUPPORTED_FEATURES) && isSupportedFeature("showFullscreenLogin")}
	<ErrorPage
		error={m.discord_block_title()}
		description={m.discord_block_desc()}
		href={errorHref}
	>
		{#snippet extraButtons()}
			<Button href="/login/discord" tag="a">
				<DiscordIcon class="fill-primary-foreground w-3.5 shrink-0" />
				<span>{m.discord_block_button()}</span>
			</Button>
		{/snippet}
	</ErrorPage>
{:else}
	<PokemonFilterset />
	<QuestFilterset />
	<RaidFilterset />

	<ContextMenu />

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


