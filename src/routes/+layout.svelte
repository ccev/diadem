<script lang="ts">
	import { i18n, resolveLanguageTag } from "@/lib/services/i18n";
	import { ParaglideJS } from "@inlang/paraglide-sveltekit";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import { loadRemoteLocale } from "@/lib/services/ingameLocale";
	import { mode, ModeWatcher, setMode } from "mode-watcher";

	let { children } = $props();

	let languageTag: string = $derived(resolveLanguageTag(getUserSettings().languageTag));
</script>

<ModeWatcher defaultMode={getUserSettings().themeMode} track={false} />
<ParaglideJS languageTag={languageTag} {i18n}>
	{@render children()}
</ParaglideJS>