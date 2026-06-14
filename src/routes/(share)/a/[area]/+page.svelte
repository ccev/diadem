<script lang="ts">
	import RedirectFlash from "@/components/ui/RedirectFlash.svelte";
	import type { PageProps } from "./$types";
	import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte";
	import { onMount } from "svelte";
	import { useMetadata } from "@/lib/ui/metadata.svelte";

	let { data }: PageProps = $props();
	useMetadata(() => ({ title: data.name }));

	onMount(() => {
		const userSettings = getUserSettings();
		userSettings.mapPosition.center.lat = data.lat;
		userSettings.mapPosition.center.lng = data.lon;
		userSettings.mapPosition.zoom = data.zoom;
		updateUserSettings();
	});
</script>

<RedirectFlash goal={data.name} />
