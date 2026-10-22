<script lang="ts">
	import "../app.css";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import { ModeWatcher } from "mode-watcher";
	import Metadata from "@/components/utils/Metadata.svelte";
	import StatusScreen from "@/components/ui/StatusScreen.svelte";
	import InstanceGate from "@/components/ui/InstanceGate.svelte";

	import { onMount } from "svelte";
	import { getConfig } from "$lib/services/config/config";
	import { getInstanceUrl } from "$lib/native/runtime";

	let { children, data } = $props();

	// remove static loader
	onMount(() => document.getElementById("initial-loader")?.remove());
</script>

{#if data?.needsInstanceGate}
	<InstanceGate />
{:else if data?.configError}
	{#if data.offline}
		<StatusScreen
			title="You're offline"
			description="Check your internet connection and try again"
		/>
	{:else}
		<StatusScreen
			title="Can't reach {getConfig()?.general?.mapName || getInstanceUrl() || 'Diadem Map'}"
			description="Check that it's online and try again"
		/>
	{/if}
{:else}
	<Metadata />

	<ModeWatcher defaultMode={getUserSettings().themeMode} track={false} />
	{@render children()}
{/if}
