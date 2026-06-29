<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		title,
		children
	}: {
		title: string,
		children: Snippet
	} = $props()
</script>

<div class="border bg-accent border-border rounded-lg px-4 py-2">
	<p class="flex items-center gap-1 text-muted-foreground text-sm font-semibold">
		{title}
	</p>
	<p
		class="font-semibold text-xl"
	>
		{@render children()}
	</p>
</div>