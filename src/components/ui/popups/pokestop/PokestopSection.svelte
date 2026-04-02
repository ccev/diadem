<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		class: class_ = "",
		children,
		stats = undefined
	}: {
		class?: string;
		children: Snippet;
		stats?: Snippet;
	} = $props();
</script>

<div class="py-2 border-border border-b group-last:mb-2 {class_}">
	<div class="flex gap-2">
		{@render children()}
	</div>
	{@render stats?.()}
</div>
