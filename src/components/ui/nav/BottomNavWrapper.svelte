<script lang="ts">
	import BottomNav from '@/components/ui/nav/BottomNav.svelte';
		import { getUserSettings } from '@/lib/userSettings.svelte.js';
	import { isUiLeft } from '@/lib/menus.svelte';

	let {
		page
	}: {
		page: string
	} = $props()
</script>

<div
	class="fixed z-10 bottom-2 w-full flex pointer-events-none"
	class:justify-end={!isUiLeft()}
>
	<BottomNav {page} />
</div>
