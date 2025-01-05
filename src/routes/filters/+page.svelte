<script lang="ts">
	import BottomNavWrapper from '@/components/ui/nav/BottomNavWrapper.svelte';
	import BottomNavSpacing from '@/components/ui/nav/BottomNavSpacing.svelte';
	import { getConfig } from '@/lib/config';
	import * as m from '@/lib/paraglide/messages';
</script>

<svelte:head>
	<title>{getConfig().general.mapName} | {m.nav_filters()}</title>
</svelte:head>

<div class="mt-2 mx-auto max-w-[30rem]">
	maybe some other day
</div>

<BottomNavSpacing />
<BottomNavWrapper page="/filters" />

