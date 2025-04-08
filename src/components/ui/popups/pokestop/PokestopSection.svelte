<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		class: class_ = "",
		children
	}: {
		class?: string
		children: Snippet
	} = $props()
</script>

<div class="py-2 flex items-center gap-2 border-border border-b group-last:mb-2 {class_}">
	{@render children()}
</div>