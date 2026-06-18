<script lang="ts">
	import RedirectFlash from "@/components/ui/RedirectFlash.svelte";
	import type { PageProps } from "./$types";
	import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte";
	import { onMount } from "svelte";
	import { useMetadata } from "@/lib/ui/metadata.svelte";
	import { setDirectLinkFeature } from "$lib/features/directLinks.svelte";
	import { getFeatureJump } from "$lib/utils/geo";

	let { data }: PageProps = $props();
	useMetadata(() => ({ title: data.feature.properties.name }));

	onMount(() => {
		setDirectLinkFeature(data.feature)

		const jump = getFeatureJump(data.feature);
		const userSettings = getUserSettings();
		userSettings.mapPosition.center.lat = jump.coords.lat;
		userSettings.mapPosition.center.lng = jump.coords.lon;
		userSettings.mapPosition.zoom = jump.zoom;
		updateUserSettings();
	});
</script>

<RedirectFlash goal={data.feature.properties.name} />
