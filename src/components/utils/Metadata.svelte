<script lang="ts">
	import { getConfig } from '@/lib/config/config';

	let {
		title,
		description
	}: {
		title?: string,
		description?: string
	} = $props();

	let pageTitle = $derived(getConfig().general.mapName + (title ? `| ${title}` : ''));
</script>

<title>{pageTitle}</title>
<meta property="og:title" content={pageTitle}>

{#if description}
	<meta property="og:description" content={description}>
{/if}