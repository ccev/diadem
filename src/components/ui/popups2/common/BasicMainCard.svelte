<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		class: class_ = "",
		children
	}: {
		class?: string,
		children?: Snippet
	} = $props()
</script>

<div class="bg-accent text-accent-foreground px-4 py-4 border border-border rounded-lg {class_}">
	{@render children?.()}
</div>