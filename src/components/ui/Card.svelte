<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		class: class_ = "",
		children = null,
		...rest
	}: HTMLAttributes & {
		class?: string;
		children?: Snippet | null;
	} = $props();
</script>

<div class="rounded-lg border bg-card text-card-foreground shadow-md {class_}" {...rest}>
	{@render children?.()}
</div>
