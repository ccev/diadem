<script lang="ts">
	import BottomNav from "@/components/ui/BottomNav.svelte";
	import ContextMenu from "@/components/ui/contextmenu/ContextMenu.svelte";
	import { getConfig } from "@/lib/services/config/config";
	import { getCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte.js";
	import WeatherOverview from "@/components/map/WeatherOverview.svelte";
	import { isSupportedFeature } from "@/lib/services/supportedFeatures";
	import { closeMenu, getOpenedMenu } from "@/lib/ui/menus.svelte.js";
	import Fabs from "@/components/ui/fab/Fabs.svelte";
	import PopupContainer from "@/components/ui/popups/PopupContainer.svelte";
	import DesktopMenu from "@/components/menus/DesktopMenu.svelte";
	import { hasLoadedFeature, LoadedFeature } from "@/lib/services/initialLoad.svelte.js";
	import Metadata from "@/components/utils/Metadata.svelte";
	import { isMenuSidebar } from "@/lib/utils/device";
	import Home from "@/components/custom/Home.svelte";
	import { isWebglSupported } from "@/lib/map/utils";
	import ErrorPage from "@/components/ui/ErrorPage.svelte";
	import * as m from "@/lib/paraglide/messages";
	import Button from "@/components/ui/input/Button.svelte";
	import DiscordIcon from "@/components/icons/DiscordIcon.svelte";
	import QuestFilterset from "@/components/menus/filters/filterset/quest/QuestFilterset.svelte";
	import RaidFilterset from "@/components/menus/filters/filterset/raid/RaidFilterset.svelte";
	import PokemonFilterset from "@/components/menus/filters/filterset/pokemon/PokemonFilterset.svelte";
	import InvasionFilterset from "@/components/menus/filters/filterset/invasion/InvasionFilterset.svelte";
	import MaxBattleFilterset from "@/components/menus/filters/filterset/maxBattle/MaxBattleFilterset.svelte";
	import { isSearchViewActive } from "@/lib/features/activeSearch.svelte.js";
	import ActiveSearchView from "@/components/ui/search/ActiveSearchView.svelte";
	import { isOnMap } from "@/lib/utils/getMapPath";
	import ErrorPageWebGl from "@/components/ui/ErrorPageWebGl.svelte";
	import MapMain from "@/components/map/MapMain.svelte";
	import MapMenuUi from "@/components/ui/MapMenuUi.svelte";
	import type maplibre from "maplibre-gl";

	let map: maplibre.Map | undefined = $state(undefined);

	$effect(() => {
		// When opening a popup on mobile while in a menu, close the menu
		if (getCurrentSelectedData() && !isMenuSidebar()) {
			closeMenu();
		}
	});

	const errorHref = getConfig().general.customHome ? "/" : "";
</script>

<Metadata />

{#if !isOnMap()}
	<Home />
{:else if !isWebglSupported()}
	<ErrorPageWebGl />
{:else if hasLoadedFeature(LoadedFeature.SUPPORTED_FEATURES) && isSupportedFeature("showFullscreenLogin")}
	<ErrorPage error={m.discord_block_title()} description={m.discord_block_desc()} href={errorHref}>
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
	<InvasionFilterset />
	<MaxBattleFilterset />

	<ContextMenu />

	{#if isSearchViewActive()}
		<div class="fixed z-10 top-2 px-2 w-full pointer-events-none">
			<ActiveSearchView />
		</div>
	{/if}

	<WeatherOverview />

	<MapMenuUi>
		{#snippet desktopLeft()}
			{#if getOpenedMenu()}
				<DesktopMenu />
			{/if}
			{#if !isSearchViewActive()}
				<BottomNav />
			{/if}
		{/snippet}
		{#snippet desktopRight()}
			{#if !isSearchViewActive()}
				<Fabs {map} />
			{/if}
			<PopupContainer />
		{/snippet}

		{#snippet mobileBottom()}
			{#if !getOpenedMenu()}
				{#if !isSearchViewActive()}
					<Fabs {map} />
				{/if}
				<PopupContainer />
			{/if}
			{#if !isSearchViewActive()}
				<BottomNav />
			{/if}
		{/snippet}
	</MapMenuUi>

	<MapMain bind:map />
{/if}
