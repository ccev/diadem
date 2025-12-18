<script lang="ts">
	import type { Snippet } from "svelte";

	let { children }: { children: Snippet } = $props()
</script>

<div class="border-border border rounded-lg px-2 py-1 flex gap-2 h-12 items-center shrink-0">
	{@render children()}
</div>