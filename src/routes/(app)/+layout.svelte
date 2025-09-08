<script lang="ts">
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { i18n, resolveLanguageTag } from '@/lib/services/i18n';

	import '../../app.css';
	import { getUserSettings } from '@/lib/services/userSettings.svelte.js';

	import Toast from '@/components/ui/Toast.svelte';
	import { getIsToastOpen } from '@/lib/ui/toasts.svelte.js';
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

	let languageTag: string = $derived(resolveLanguageTag(getUserSettings().languageTag));
	$effect(() => loadRemoteLocale(languageTag).then())
</script>

<svelte:head>
	<Metadata />
</svelte:head>

<ParaglideJS languageTag={languageTag} {i18n}>

	{#if getIsLoading()}
		<Loading />
	{/if}

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