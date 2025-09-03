<script lang="ts">
	import { getConfig } from '@/lib/services/config/config';

	let {
		title,
		embedTitle,
		description,
		thumbnail,
		color
	}: {
		title?: string,
		embedTitle?: string,
		description?: string,
		thumbnail?: string,
		color?: string
	} = $props();

	let pageTitle = $derived(getConfig().general.mapName + (title ? ` | ${title}` : ''));
</script>

<title>{pageTitle}</title>
<meta property="og:title" content={embedTitle ? embedTitle : pageTitle}>
<meta name="twitter:title" content={embedTitle ? embedTitle : pageTitle}>

<meta property="og:site_name" content={getConfig().general.mapName}>
<meta name="twitter:site" content={getConfig().general.mapName}>


{#if description}
	<meta property="og:description" content={description}>
	<meta name="twitter:description" content={description}>
{/if}

{#if thumbnail}
	<meta property="og:image" content={thumbnail} />
	<meta name="twitter:card" content="summary_large_image">
	<meta name="twitter:image:src" content={thumbnail}>
{/if}

{#if color}
	<meta name="theme-color" content={color}>
{/if}
