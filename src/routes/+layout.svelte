<script lang="ts">
	import "../app.css";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import { ModeWatcher } from "mode-watcher";

	let { children } = $props();
</script>

<ModeWatcher defaultMode={getUserSettings().themeMode} track={false} />
{@render children()}