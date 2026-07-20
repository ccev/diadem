<script lang="ts">
	import type { Snippet } from "svelte";
	import { getDrawerContext } from "./context.svelte.js";

	let { children }: { children?: Snippet } = $props();
	const state = getDrawerContext();

	$effect(() => {
		if (!state.open || !state.viewport || !window.visualViewport) return;
		const viewport = state.viewport;
		const visualViewport = window.visualViewport;
		function update() {
			if (visualViewport.scale !== 1) return;
			const inset = Math.max(
				0,
				window.innerHeight - visualViewport.height - visualViewport.offsetTop
			);
			viewport.style.setProperty(
				"--drawer-keyboard-inset",
				`${inset > 60 ? Math.ceil(inset) : 0}px`
			);
			const active = document.activeElement;
			if (inset > 60 && active instanceof HTMLElement && viewport.contains(active)) {
				active.scrollIntoView({
					block: "center",
					behavior: "auto"
				});
			}
		}
		visualViewport.addEventListener("resize", update);
		visualViewport.addEventListener("scroll", update);
		document.addEventListener("focusin", update, true);
		update();
		return () => {
			visualViewport.removeEventListener("resize", update);
			visualViewport.removeEventListener("scroll", update);
			document.removeEventListener("focusin", update, true);
			viewport.style.removeProperty("--drawer-keyboard-inset");
		};
	});
</script>

{@render children?.()}
