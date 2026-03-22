<script lang="ts">
	import { getConfig } from "@/lib/services/config/config";

	let {
		title,
		embedTitle,
		description,
		thumbnail,
		image,
		color
	}: {
		title?: string,
		embedTitle?: string,
		description?: string,
		thumbnail?: string,
		image?: string,
		color?: string
	} = $props();

	let config = $derived(getConfig());
	let general = $derived(config.general);
	let pageTitle = $derived(general.mapName + (title ? ` | ${title}` : ""));
	let effectiveDescription = $derived(description ?? general.description);
	let effectiveThumbnail = $derived(thumbnail ?? general.image);
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta property="og:title" content={embedTitle ? embedTitle : pageTitle}>
	<meta name="twitter:title" content={embedTitle ? embedTitle : pageTitle}>

	<meta property="og:site_name" content={general.mapName}>
	<meta name="twitter:site" content={general.mapName}>

	{#if effectiveDescription}
		<meta name="description" content={effectiveDescription}>
		<meta property="og:description" content={effectiveDescription}>
		<meta name="twitter:description" content={effectiveDescription}>
	{/if}

	{#if effectiveThumbnail && !image}
		<meta property="og:image" content={effectiveThumbnail} />
		<meta name="twitter:image:src" content={effectiveThumbnail}>
	{/if}

	{#if image}
		<meta name="twitter:card" content="summary_large_image">
		<meta property="og:image" content={image} />
		<meta name="twitter:image:src" content={image}>
	{/if}

	{#if color}
		<meta name="theme-color" content={color}>
	{/if}
</svelte:head>