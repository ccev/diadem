<script lang="ts">
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { i18n, resolveLanguageTag } from '@/lib/services/i18n';

	import '../../app.css';
	import { getUserSettings } from '@/lib/services/userSettings.svelte.js';

	import Toast from '@/components/ui/Toast.svelte';
	import { getIsToastOpen } from '@/lib/ui/toasts.svelte.js';
	import { closeModal, getModalOptions, isModalOpen } from '@/lib/ui/modal.svelte.js';
	import { getConfig } from '@/lib/services/config/config';
	import { loadRemoteLocale } from '@/lib/services/ingameLocale';
	import { getIsLoading, load } from '@/lib/services/initialLoad.svelte.js';
	import Loading from '@/components/ui/Loading.svelte';
	import { updateDarkMode } from '@/lib/utils/updateDarkMode';
	import { onMount } from 'svelte';
	import Metadata from '@/components/utils/Metadata.svelte';

	let { children } = $props();

	onMount(() => load().then())

	$effect(() => {
		if (getIsLoading()) return;
		getUserSettings().isDarkMode;
		updateDarkMode();
	});

	let dialog: HTMLDialogElement | undefined = $state(undefined);
	$effect(() => {
		if (!dialog) return;

		if (isModalOpen()) {
			dialog.showModal();
		} else {
			dialog.close();
		}
	});

	let languageTag: string = $state('en');
	$effect(() => {
		languageTag = resolveLanguageTag(getUserSettings().languageTag);
		loadRemoteLocale(languageTag);  // TODO this is called twice when changing language
	});
</script>

<svelte:head>
	<Metadata />
</svelte:head>

<ParaglideJS languageTag={languageTag} {i18n}>

	{#if getIsLoading()}
		<Loading />
	{/if}
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