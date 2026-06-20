<script lang="ts">
	import "../app.css";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import { ModeWatcher } from "mode-watcher";
	import Metadata from "@/components/utils/Metadata.svelte";
	import InstanceUnreachable from "@/components/ui/InstanceUnreachable.svelte";

	let { children, data } = $props();
</script>

{#if data?.configError}
	<InstanceUnreachable />
{:else}
	<Metadata />

	<ModeWatcher defaultMode={getUserSettings().themeMode} track={false} />
	{@render children()}
{/if}
