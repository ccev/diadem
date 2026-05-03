<script lang="ts">
	import { getConfig } from "@/lib/services/config/config";
	import { getCurrentMetadata, type MetadataState } from "@/lib/ui/metadata.svelte";

	let {
		title: titleProp,
		embedTitle: embedTitleProp,
		description: descriptionProp,
		thumbnail: thumbnailProp,
		image: imageProp,
		color: colorProp
	}: MetadataState = $props();

	let config = $derived(getConfig());
	let general = $derived(config.general);
	let hasProps = $derived(
		titleProp !== undefined ||
			embedTitleProp !== undefined ||
			descriptionProp !== undefined ||
			thumbnailProp !== undefined ||
			imageProp !== undefined ||
			colorProp !== undefined
	);
	let metadata = $derived(
		hasProps
			? {
					title: titleProp,
					embedTitle: embedTitleProp,
					description: descriptionProp,
					thumbnail: thumbnailProp,
					image: imageProp,
					color: colorProp
				}
			: getCurrentMetadata()
	);
	let title = $derived(metadata.title);
	let embedTitle = $derived(metadata.embedTitle);
	let description = $derived(metadata.description);
	let thumbnail = $derived(metadata.thumbnail);
	let image = $derived(metadata.image);
	let color = $derived(metadata.color);
	let pageTitle = $derived(general.mapName + (title ? ` | ${title}` : ""));
	let effectiveDescription = $derived(description ?? general.description);
	let effectiveImage = $derived(image ?? general.image);
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta property="og:title" content={embedTitle ? embedTitle : pageTitle} />
	<meta name="twitter:title" content={embedTitle ? embedTitle : pageTitle} />

	<meta property="og:site_name" content={general.mapName} />
	<meta name="twitter:site" content={general.mapName} />

	{#if effectiveDescription}
		<meta name="description" content={effectiveDescription} />
		<meta property="og:description" content={effectiveDescription} />
		<meta name="twitter:description" content={effectiveDescription} />
	{/if}

	{#if thumbnail && !image}
		<meta property="og:image" content={thumbnail} />
		<meta name="twitter:image:src" content={thumbnail} />
	{/if}

	{#if effectiveImage}
		<meta name="twitter:card" content="summary_large_image" />
		<meta property="og:image" content={effectiveImage} />
		<meta name="twitter:image:src" content={effectiveImage} />
	{/if}

	{#if color}
		<meta name="theme-color" content={color} />
	{/if}
</svelte:head>
