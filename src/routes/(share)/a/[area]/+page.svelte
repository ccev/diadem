<script lang="ts">
	import RedirectFlash from "@/components/ui/RedirectFlash.svelte";
	import type { PageProps } from "./$types";
	import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte";
	import Metadata from "@/components/utils/Metadata.svelte";
	import { onMount } from "svelte";

	let { data }: PageProps = $props();

	onMount(() => {
		const userSettings = getUserSettings()
		userSettings.mapPosition.center.lat = data.lat
		userSettings.mapPosition.center.lng = data.lon
		userSettings.mapPosition.zoom = data.zoom
		updateUserSettings()
	})
</script>

<Metadata
	title={data.name}
/>

<RedirectFlash goal={data.name} />