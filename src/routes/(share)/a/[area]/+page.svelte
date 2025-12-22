<script lang="ts">
	import RedirectFlash from "@/components/ui/RedirectFlash.svelte";
	import type { PageProps } from "./$types";
	import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte";
	import { browser } from "$app/environment";
	import { getShareText } from "@/lib/features/shareTexts";
	import Metadata from "@/components/utils/Metadata.svelte";

	let { data }: PageProps = $props();

	const userSettings = getUserSettings()
	userSettings.mapPosition.center.lat = data.lat
	userSettings.mapPosition.center.lng = data.lon
	userSettings.mapPosition.zoom = data.zoom
	updateUserSettings()
</script>

<svelte:head>
	<Metadata
		title={data.name}
	/>
</svelte:head>

<RedirectFlash goal={data.name} />