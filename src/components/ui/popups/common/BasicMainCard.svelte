<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		class: class_ = "",
		children
	}: {
		class?: string,
		children?: Snippet
	} = $props();
</script>

<div class="basic-main-card bg-accent text-accent-foreground px-4 pt-4 pb-4 border border-border rounded-lg {class_}">
	{@render children?.()}
</div>

<style>
	.basic-main-card:has(> :global(button:last-child)) {
		padding-bottom: 0;
	}
</style>
