<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		class: class_ = "",
		children
	}: {
		class?: string,
		children: Snippet
	} = $props();
</script>

<div class="flex flex-wrap gap-x-2 gap-y-3 overflow-y-scroll {class_}">
	{@render children()}
</div>

