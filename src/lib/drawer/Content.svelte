<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	let { children, ...props }: HTMLAttributes<HTMLDivElement> & { children?: Snippet } = $props();
</script>

<div {...props} data-drawer-content="">{@render children?.()}</div>
