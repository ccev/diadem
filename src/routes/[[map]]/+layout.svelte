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
