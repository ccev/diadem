<script lang="ts">
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { i18n, resolveLanguageTag } from '@/lib/i18n';

	import '../app.css';
	import { getUserSettings } from '@/lib/userSettings.svelte';

	import { updateDarkMode } from '@/lib/utils.svelte';
	import Toast from '@/components/ui/toast/Toast.svelte';
	import { getIsToastOpen } from '@/components/ui/toast/toastUtils.svelte';
	import { closeModal, getModalOptions, isModalOpen } from '@/lib/modal.svelte';
	import { getConfig } from '@/lib/config';
	import { loadRemoteLocale } from '@/lib/ingameLocale';
	import { slide } from 'svelte/transition';
	import PokemonPopup from '@/components/ui/popups/pokemon/PokemonPopup.svelte';
	import PokestopPopup from '@/components/ui/popups/pokestop/PokestopPopup.svelte';
	import {closePopup} from '@/lib/mapObjects/interact';
	import {getCurrentSelectedData, getCurrentSelectedMapId} from '@/lib/mapObjects/currentSelectedState.svelte';
	import SearchFab from '@/components/ui/fab/SearchFab.svelte';
	import LocateFab from '@/components/ui/fab/LocateFab.svelte';
	import BottomNav from '@/components/ui/nav/BottomNav.svelte';
	import Map from '@/components/map/Map.svelte';
	import maplibre from 'maplibre-gl';
	import ContextMenu from '@/components/ui/contextmenu/ContextMenu.svelte';
	import { getIsContxtMenuOpen } from '@/components/ui/contextmenu/utils.svelte';
	import GymPopup from '@/components/ui/popups/gym/GymPopup.svelte';
	import StationPopup from '@/components/ui/popups/station/StationPopup.svelte';

	let { children } = $props();

	$effect(() => {
		getUserSettings().isDarkMode
		updateDarkMode()
	})

	let dialog: HTMLDialogElement
	$effect(() => {
		if (isModalOpen()) {
			dialog.showModal()
		} else {
			dialog.close()
		}
	})

	let languageTag: string = $state("en")
	$effect(() => {
		languageTag = resolveLanguageTag(getUserSettings().languageTag)
		loadRemoteLocale(languageTag)  // TODO this is called twice when changing language
	})

	let map: maplibre.Map | undefined = $state()

	function resetMap() {
		closePopup()
		closeModal()
		map?.easeTo({
			bearing: 0,
			pitch: 0
		})
	}
</script>

<svelte:head>
	<title>{getConfig().general.mapName}</title>
</svelte:head>

<ParaglideJS languageTag={languageTag} {i18n}>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	style="max-width: calc(100vw - 1rem);"
	class="shadow-md mx-auto overflow-hidden w-fit rounded-md appearance-none bg-transparent backdrop:backdrop-blur-[1px] backdrop:backdrop-brightness-95 backdrop:transition-all"
	onclose={() => closeModal()}
	onclick={() => closeModal()}
	class:my-auto={getModalOptions().vertical === "center"}
	class:mt-2={getModalOptions().vertical === "top"}
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="w-full h-full" onclick={e => e.stopPropagation()}>
		{@render getModalOptions().snippet?.()}
	</div>
</dialog>


{#if getIsToastOpen()}
	<Toast />
{/if}

{@render children?.()}

	{#if getIsContxtMenuOpen()}
		<ContextMenu />
	{/if}

	<div
		class="fixed z-10 bottom-2 w-full flex flex-col pointer-events-none items-start"
		class:items-end={!getUserSettings().isLeftHanded}
	>
		<div
			class="mx-2 gap-2 mb-2 flex-col flex"
		>
			<SearchFab {map} />
			<LocateFab {map} />

		</div>

		{#if getCurrentSelectedData()}
			<div
				class="w-full max-w-[30rem] mb-2 z-10"
				style="pointer-events: all"
				transition:slide={{duration: 50}}
			>
				{#if getCurrentSelectedData().type === "pokemon"}
					<PokemonPopup mapId={getCurrentSelectedMapId()} />
				{:else if getCurrentSelectedData().type === "pokestop"}
					<PokestopPopup mapId={getCurrentSelectedMapId()} />
				{:else if getCurrentSelectedData().type === "gym"}
					<GymPopup mapId={getCurrentSelectedMapId()} />
				{:else if getCurrentSelectedData().type === "station"}
					<StationPopup mapId={getCurrentSelectedMapId()} />
				{/if}
			</div>
		{/if}

<!--		<BottomNav page="/" onmapclick={resetMap} />-->
	</div>

	<div class="absolute w-screen h-screen">
		<Map bind:map />
	</div>


</ParaglideJS>

<style lang="postcss">
    @keyframes come-down {
        0% {
			opacity: 0;
			transform: translateY(100%);
        }
        100% {
            opacity: 100%;
            transform: translateY(0);
        }
    }

	@keyframes scale-up {
		0% {
			scale: 75%;
			opacity: 75%;
		}
		100% {
            scale: 100%;
            opacity: 100%;
		}
	}

	/* TODO: come-down if modal is top-aligned */
	dialog[open] {
        animation: scale-up 100ms cubic-bezier(0.4, 0, 0.2, 1);
    }
</style>