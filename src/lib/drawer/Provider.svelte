<script lang="ts">
	import type { Snippet } from "svelte";
	import { setDrawerProviderContext } from "./context.svelte.js";

	let { children }: { children?: Snippet } = $props();
	const state = $state({
		drawers: new Map<string, boolean>(),
		active: false,
		swipeProgress: 0,
		frontmostHeight: 0
	});
	setDrawerProviderContext(state);
</script>

{@render children?.()}
