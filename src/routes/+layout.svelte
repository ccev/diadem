<script lang="ts">
	import '../app.css';
	import {initAllIconSets} from '@/lib/uicons.svelte';
	import { onMount } from 'svelte';
	import {getUserSettings} from '@/lib/userSettings.svelte';

	import { updateDarkMode } from '@/lib/utils.svelte';
	import Toast from '@/components/ui/toast/Toast.svelte';
	import { getIsToastOpen } from '@/components/ui/toast/toastUtils.svelte';

	let { children } = $props();

	$effect(() => {
		getUserSettings().isDarkMode
		updateDarkMode()
	})
</script>

{#if getIsToastOpen()}
	<Toast />
{/if}

{@render children?.()}
