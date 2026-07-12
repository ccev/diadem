<script lang="ts">
	import { getDrawerContext, getDrawerProviderContext } from "./context.svelte.js";
	const drawer = getDrawerContext();
	const provider = getDrawerProviderContext();

	$effect(() => {
		if (!provider) return;
		provider.drawers.set(drawer.id, drawer.open);
		provider.active = [...provider.drawers.values()].some(Boolean);
		provider.swipeProgress = drawer.swipeProgress;
		provider.frontmostHeight = drawer.swipeProgress > 0 ? drawer.frontmostHeight : 0;
		return () => {
			provider.drawers.delete(drawer.id);
			provider.active = [...provider.drawers.values()].some(Boolean);
		};
	});
</script>
