<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		class: class_ = "",
		children = undefined,
		...rest
	}: HTMLAttributes<HTMLDivElement> & {
		class?: string;
		children?: Snippet;
	} = $props();
</script>

<div class="rounded-lg border bg-card text-card-foreground shadow-md {class_}" {...rest}>
	{@render children?.()}
</div>
