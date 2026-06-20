<script lang="ts">
	import "../app.css";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import { ModeWatcher } from "mode-watcher";
	import Metadata from "@/components/utils/Metadata.svelte";
	import InstanceUnreachable from "@/components/ui/InstanceUnreachable.svelte";
	import InstanceGate from "@/components/ui/InstanceGate.svelte";
	import { onMount } from "svelte";

	let { children, data } = $props();

	// The static shell shows a themed loader until the app mounts; remove it now.
	onMount(() => document.getElementById("initial-loader")?.remove());
</script>

{#if data?.needsInstanceGate}
	<InstanceGate />
{:else if data?.configError}
	<InstanceUnreachable />
{:else}
	<Metadata />

	<ModeWatcher defaultMode={getUserSettings().themeMode} track={false} />
	{@render children()}
{/if}
