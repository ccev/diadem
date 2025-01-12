<script lang="ts">
	import { ParaglideJS } from '@inlang/paraglide-sveltekit'
	import { i18n } from '@/lib/i18n'

	import '../app.css';
	import {initAllIconSets} from '@/lib/uicons.svelte';
	import { onMount } from 'svelte';
	import {getUserSettings} from '@/lib/userSettings.svelte';

	import { updateDarkMode } from '@/lib/utils.svelte';
	import Toast from '@/components/ui/toast/Toast.svelte';
	import { getIsToastOpen } from '@/components/ui/toast/toastUtils.svelte';
	import { closeModal, getModalOptions, isModalOpen } from '@/lib/modal.svelte';
	import {fade, slide} from 'svelte/transition';
	import { availableLanguageTags } from '@/lib/paraglide/runtime';
	import { getConfig } from '@/lib/config';

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
		if (getUserSettings().languageTag === "auto") {
			const browserTag = window.navigator.language.toLowerCase().split("-")[0]
			languageTag = availableLanguageTags.find(l => l === browserTag) ?? "en"
		} else {
			languageTag = getUserSettings().languageTag
		}
	})
</script>

<svelte:head>
	<title>{getConfig().general.mapName}</title>
</svelte:head>

<ParaglideJS languageTag={languageTag} {i18n}>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	style="max-width: calc(100vw - 1rem);"
	class="shadow-md w-fit rounded-md appearance-none bg-transparent max-w-[30rem] backdrop:backdrop-blur-[1px] backdrop:backdrop-brightness-95 backdrop:transition-all"
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
			@apply -translate-y-full opacity-0;
        }
        100% {
            @apply translate-y-0 opacity-100;
        }
    }

	@keyframes scale-up {
		0% {
			@apply scale-75 opacity-75;
		}
		100% {
			@apply scale-100 opacity-100
		}
	}

	/* TODO: come-down if modal is top-aligned */
	dialog[open] {
        animation: scale-up 100ms cubic-bezier(0.4, 0, 0.2, 1);
    }
</style>