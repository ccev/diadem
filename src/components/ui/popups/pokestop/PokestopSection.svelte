<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		children,
		titleParts,
		stats = undefined
	}: {
		children: Snippet;
		titleParts: string[];
		stats?: Snippet;
	} = $props();
</script>

<div class="bg-accent text-accent-foreground rounded-lg px-4 pt-2 pb-3 w-full border border-border first:mt-1">
	<p class="font-semibold text-sm text-muted-foreground">
		{titleParts.join(" · ")}
	</p>
	<div class="mt-1">
		{@render children()}
	</div>
	{@render stats?.()}
</div>
