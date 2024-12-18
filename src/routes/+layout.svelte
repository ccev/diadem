<script lang="ts">
	import '../app.css';
	import {initAllIconSets} from '@/lib/uicons.svelte';
	import { onMount } from 'svelte';
	import {getUserSettings} from '@/lib/userSettings.svelte';

	import { updateDarkMode } from '@/lib/utils';

	let { children } = $props();

	$effect(() => {
		getUserSettings().isDarkMode
		updateDarkMode()
	})
</script>

{@render children?.()}
